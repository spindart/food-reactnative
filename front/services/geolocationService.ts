export interface AddressSuggestion {
  id: string;
  displayName: string;
  latitude: number;
  longitude: number;
  addressComponents?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
}

export interface GeolocationServiceConfig {
  googleMapsApiKey?: string;
  enableGoogleMaps?: boolean;
  enableNominatim?: boolean;
  countryCode?: string;
}

class GeolocationService {
  private config: GeolocationServiceConfig;

  constructor(config: GeolocationServiceConfig = {}) {
    this.config = {
      enableGoogleMaps: true,
      enableNominatim: true,
      countryCode: 'br',
      ...config,
    };
  }

  /**
   * Busca sugestões de endereço usando Google Maps API com fallback para Nominatim
   */
  async searchAddress(query: string): Promise<AddressSuggestion[]> {
    if (!query || query.length < 3) {
      return [];
    }

    try {
      // Tentar Google Maps primeiro se configurado
      if (this.config.enableGoogleMaps && this.config.googleMapsApiKey) {
        const googleResults = await this.searchWithGoogleMaps(query);
        if (googleResults.length > 0) {
          return googleResults;
        }
      }

      // Fallback para Nominatim
      if (this.config.enableNominatim) {
        return await this.searchWithNominatim(query);
      }

      return [];
    } catch (error) {
      console.error('Erro na busca de endereços:', error);
      
      // Tentar fallback se Google Maps falhar
      if (this.config.enableNominatim) {
        try {
          return await this.searchWithNominatim(query);
        } catch (fallbackError) {
          console.error('Erro no fallback Nominatim:', fallbackError);
          return [];
        }
      }
      
      return [];
    }
  }

  /**
   * Busca endereços com número específico (ex: "Rua das Flores 123")
   */
  async searchAddressWithNumber(query: string): Promise<AddressSuggestion[]> {
    if (!query || query.length < 5) {
      return [];
    }

    // Se a query já contém números, usar busca normal
    if (/\d/.test(query)) {
      return this.searchAddress(query);
    }

    // Se não contém números, tentar buscar com sufixos comuns
    const numberSuffixes = ['', ' 1', ' 10', ' 100', ' 200', ' 500'];
    const results: AddressSuggestion[] = [];

    for (const suffix of numberSuffixes) {
      try {
        const searchQuery = query + suffix;
        const suggestions = await this.searchAddress(searchQuery);
        
        // Adicionar apenas resultados únicos
        suggestions.forEach(suggestion => {
          if (!results.find(r => r.id === suggestion.id)) {
            results.push(suggestion);
          }
        });
        
        // Limitar a 5 resultados no total
        if (results.length >= 5) break;
      } catch (error) {
        console.warn(`Erro ao buscar "${query + suffix}":`, error);
      }
    }

    return results.slice(0, 5);
  }

  /**
   * Busca usando Google Maps Places API
   */
  private async searchWithGoogleMaps(query: string): Promise<AddressSuggestion[]> {
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${this.config.googleMapsApiKey}&components=country:${this.config.countryCode}&language=pt-BR&region=${this.config.countryCode}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Maps API error: ${data.status}`);
    }

    const suggestions: AddressSuggestion[] = [];

    for (const prediction of data.predictions || []) {
      try {
        // Buscar detalhes do lugar para obter coordenadas
        const details = await this.getGooglePlaceDetails(prediction.place_id);
        if (details) {
          // Usar o endereço formatado completo se disponível, senão usar a descrição da predição
          const displayName = details.formatted_address || prediction.description;
          
          suggestions.push({
            id: prediction.place_id,
            displayName: displayName,
            latitude: details.geometry.location.lat,
            longitude: details.geometry.location.lng,
            addressComponents: this.parseGoogleAddressComponents(details.address_components),
          });
        }
      } catch (error) {
        console.warn('Erro ao buscar detalhes do lugar:', error);
      }
    }

    return suggestions.slice(0, 5); // Limitar a 5 resultados
  }

  /**
   * Busca detalhes de um lugar específico no Google Maps
   */
  private async getGooglePlaceDetails(placeId: string): Promise<any> {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${this.config.googleMapsApiKey}&fields=geometry,address_components,formatted_address,name&language=pt-BR`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK') {
      return data.result;
    }
    
    return null;
  }

  /**
   * Busca usando Nominatim (OpenStreetMap)
   */
  private async searchWithNominatim(query: string): Promise<AddressSuggestion[]> {
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=${this.config.countryCode}&q=${encodeURIComponent(query)}&limit=5&bounded=1&viewbox=-74.0,-34.0,-34.0,5.0`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'FoodApp/1.0',
      },
    });
    
    const data = await response.json();

    return data.map((item: any) => {
      // Tentar construir um endereço mais completo com número se disponível
      let displayName = item.display_name;
      
      if (item.address && item.address.house_number) {
        // Se temos número da casa, tentar construir um endereço mais específico
        const parts = [];
        if (item.address.road) parts.push(item.address.road);
        if (item.address.house_number) parts.push(item.address.house_number);
        if (item.address.city || item.address.town || item.address.village) {
          parts.push(item.address.city || item.address.town || item.address.village);
        }
        if (item.address.state) parts.push(item.address.state);
        
        if (parts.length > 0) {
          displayName = parts.join(', ');
        }
      }
      
      return {
        id: item.place_id.toString(),
        displayName: displayName,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        addressComponents: this.parseNominatimAddressComponents(item.address),
      };
    });
  }

  /**
   * Converte coordenadas em endereço (reverse geocoding)
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<AddressSuggestion | null> {
    try {
      // Tentar Google Maps primeiro
      if (this.config.enableGoogleMaps && this.config.googleMapsApiKey) {
        const googleResult = await this.reverseGeocodeWithGoogleMaps(latitude, longitude);
        if (googleResult) {
          return googleResult;
        }
      }

      // Fallback para Nominatim
      if (this.config.enableNominatim) {
        return await this.reverseGeocodeWithNominatim(latitude, longitude);
      }

      return null;
    } catch (error) {
      console.error('Erro no reverse geocoding:', error);
      
      // Tentar fallback
      if (this.config.enableNominatim) {
        try {
          return await this.reverseGeocodeWithNominatim(latitude, longitude);
        } catch (fallbackError) {
          console.error('Erro no fallback reverse geocoding:', fallbackError);
          return null;
        }
      }
      
      return null;
    }
  }

  /**
   * Reverse geocoding com Google Maps
   */
  private async reverseGeocodeWithGoogleMaps(latitude: number, longitude: number): Promise<AddressSuggestion | null> {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${this.config.googleMapsApiKey}&language=pt-BR&region=${this.config.countryCode}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      // Filtrar apenas resultados do Brasil
      const brazilResults = data.results.filter((result: any) => 
        result.address_components.some((component: any) => 
          component.types.includes('country') && component.short_name === 'BR'
        )
      );

      if (brazilResults.length > 0) {
        const result = brazilResults[0];
        return {
          id: result.place_id,
          displayName: result.formatted_address,
          latitude,
          longitude,
          addressComponents: this.parseGoogleAddressComponents(result.address_components),
        };
      }
    }

    return null;
  }

  /**
   * Reverse geocoding com Nominatim
   */
  private async reverseGeocodeWithNominatim(latitude: number, longitude: number): Promise<AddressSuggestion | null> {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'FoodApp/1.0',
      },
    });
    
    const data = await response.json();

    if (data && data.display_name) {
      return {
        id: data.place_id.toString(),
        displayName: data.display_name,
        latitude,
        longitude,
        addressComponents: this.parseNominatimAddressComponents(data.address),
      };
    }

    return null;
  }

  /**
   * Parseia componentes de endereço do Google Maps
   */
  private parseGoogleAddressComponents(components: any[]): any {
    const parsed: any = {};
    
    components.forEach((component) => {
      const types = component.types;
      
      if (types.includes('street_number')) {
        parsed.streetNumber = component.long_name;
      }
      if (types.includes('route')) {
        parsed.street = component.long_name;
      }
      if (types.includes('locality')) {
        parsed.city = component.long_name;
      }
      if (types.includes('administrative_area_level_1')) {
        parsed.state = component.short_name;
      }
      if (types.includes('country')) {
        parsed.country = component.long_name;
      }
      if (types.includes('postal_code')) {
        parsed.postalCode = component.long_name;
      }
      if (types.includes('sublocality') || types.includes('sublocality_level_1')) {
        parsed.neighborhood = component.long_name;
      }
    });

    return parsed;
  }

  /**
   * Parseia componentes de endereço do Nominatim
   */
  private parseNominatimAddressComponents(address: any): any {
    return {
      streetNumber: address?.house_number,
      street: address?.road || address?.street,
      city: address?.city || address?.town || address?.village,
      state: address?.state,
      country: address?.country,
      postalCode: address?.postcode,
      neighborhood: address?.suburb || address?.neighbourhood,
    };
  }

  /**
   * Calcula distância entre duas coordenadas (em km)
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Raio da Terra em km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }
}

// Instância singleton
const geolocationService = new GeolocationService({
  googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
  enableGoogleMaps: !!process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
  enableNominatim: true,
  countryCode: 'br',
});

export default geolocationService;
