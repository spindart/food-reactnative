import geolocationService from './geolocationService';

/**
 * Serviço para cálculos relacionados à área de entrega
 * Este serviço será usado posteriormente para a funcionalidade do entregador
 */

export interface DeliveryArea {
  estabelecimentoId: string;
  estabelecimentoNome: string;
  estabelecimentoLatitude: number;
  estabelecimentoLongitude: number;
  raioEntrega: number; // em km
}

export interface ClienteLocation {
  clienteId: string;
  enderecoId: string;
  latitude: number;
  longitude: number;
  enderecoCompleto: string;
}

export interface DeliveryDistance {
  estabelecimentoId: string;
  estabelecimentoNome: string;
  distanciaKm: number;
  tempoEstimadoMinutos: number;
  dentroDaArea: boolean;
}

class DeliveryAreaService {
  /**
   * Verifica se um cliente está dentro da área de entrega de um estabelecimento
   */
  isWithinDeliveryArea(
    clienteLocation: ClienteLocation,
    estabelecimento: DeliveryArea
  ): boolean {
    const distance = geolocationService.calculateDistance(
      clienteLocation.latitude,
      clienteLocation.longitude,
      estabelecimento.estabelecimentoLatitude,
      estabelecimento.estabelecimentoLongitude
    );

    return distance <= estabelecimento.raioEntrega;
  }

  /**
   * Calcula a distância entre cliente e estabelecimento
   */
  calculateDeliveryDistance(
    clienteLocation: ClienteLocation,
    estabelecimento: DeliveryArea
  ): DeliveryDistance {
    const distance = geolocationService.calculateDistance(
      clienteLocation.latitude,
      clienteLocation.longitude,
      estabelecimento.estabelecimentoLatitude,
      estabelecimento.estabelecimentoLongitude
    );

    // Estimativa de tempo baseada na distância (considerando trânsito urbano)
    const tempoEstimado = this.estimateDeliveryTime(distance);

    return {
      estabelecimentoId: estabelecimento.estabelecimentoId,
      estabelecimentoNome: estabelecimento.estabelecimentoNome,
      distanciaKm: Math.round(distance * 100) / 100, // Arredondar para 2 casas decimais
      tempoEstimadoMinutos: tempoEstimado,
      dentroDaArea: distance <= estabelecimento.raioEntrega,
    };
  }

  /**
   * Filtra estabelecimentos que atendem a área do cliente
   */
  filterEstabelecimentosByArea(
    clienteLocation: ClienteLocation,
    estabelecimentos: DeliveryArea[]
  ): DeliveryDistance[] {
    return estabelecimentos
      .map(estabelecimento => this.calculateDeliveryDistance(clienteLocation, estabelecimento))
      .filter(result => result.dentroDaArea)
      .sort((a, b) => a.distanciaKm - b.distanciaKm); // Ordenar por distância
  }

  /**
   * Calcula rota otimizada para entregador (múltiplas entregas)
   */
  calculateOptimalRoute(
    entregadorLocation: { latitude: number; longitude: number },
    entregas: ClienteLocation[]
  ): ClienteLocation[] {
    // Algoritmo simples de nearest neighbor para otimização de rota
    const route: ClienteLocation[] = [];
    const remaining = [...entregas];
    let currentLocation = entregadorLocation;

    while (remaining.length > 0) {
      // Encontrar a entrega mais próxima
      let nearestIndex = 0;
      let nearestDistance = geolocationService.calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        remaining[0].latitude,
        remaining[0].longitude
      );

      for (let i = 1; i < remaining.length; i++) {
        const distance = geolocationService.calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          remaining[i].latitude,
          remaining[i].longitude
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      }

      // Adicionar à rota e atualizar localização atual
      const nearestDelivery = remaining.splice(nearestIndex, 1)[0];
      route.push(nearestDelivery);
      currentLocation = {
        latitude: nearestDelivery.latitude,
        longitude: nearestDelivery.longitude,
      };
    }

    return route;
  }

  /**
   * Estima tempo de entrega baseado na distância
   */
  private estimateDeliveryTime(distanceKm: number): number {
    // Considerando velocidade média de 20 km/h em área urbana
    // + tempo de preparo e trânsito
    const baseTime = (distanceKm / 20) * 60; // em minutos
    const preparationTime = 15; // tempo de preparo mínimo
    const trafficFactor = 1.5; // fator de trânsito

    return Math.round((baseTime + preparationTime) * trafficFactor);
  }

  /**
   * Valida se as coordenadas são válidas
   */
  isValidCoordinates(latitude: number, longitude: number): boolean {
    return (
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180 &&
      !isNaN(latitude) &&
      !isNaN(longitude)
    );
  }

  /**
   * Formata distância para exibição
   */
  formatDistance(distanceKm: number): string {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m`;
    }
    return `${distanceKm.toFixed(1)}km`;
  }

  /**
   * Formata tempo estimado para exibição
   */
  formatEstimatedTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  }
}

// Instância singleton
const deliveryAreaService = new DeliveryAreaService();

export default deliveryAreaService;
