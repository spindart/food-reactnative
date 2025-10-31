import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class EstabelecimentoController {
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { nome, descricao, endereco, latitude, longitude, tempoEntregaMin, tempoEntregaMax, taxaEntrega, categorias, imagem, diasAbertos, horaAbertura, horaFechamento, aberto, freteGratisAtivado, valorMinimoFreteGratis } = req.body;
      // Pega o id do usuário autenticado (dono)
      const user = (req as any).user;
      if (!user || user.role !== 'dono') {
        res.status(403).json({ error: 'Apenas usuários com perfil de dono podem criar estabelecimentos.' });
        return;
      }
      if (categorias && categorias.length > 3) {
        res.status(400).json({ error: 'Selecione no máximo 3 categorias.' });
        return;
      }
      let categoriaConnect = [];
      if (categorias && categorias.length > 0) {
        categoriaConnect = await Promise.all(
          categorias.map(async (nome: string) => {
            let cat = await prisma.categoria.findUnique({ where: { nome } });
            if (!cat) cat = await prisma.categoria.create({ data: { nome } });
            return { id: cat.id };
          })
        );
      }
      const estabelecimento = await prisma.estabelecimento.create({
        data: {
          nome,
          descricao,
          endereco,
          latitude,
          longitude,
          donoId: user.id,
          tempoEntregaMin: tempoEntregaMin ?? 30,
          tempoEntregaMax: tempoEntregaMax ?? 50,
          taxaEntrega: taxaEntrega ?? 5.0,
          categorias: { connect: categoriaConnect },
          imagem: imagem ?? undefined,
          diasAbertos: Array.isArray(diasAbertos) ? diasAbertos.map((d: any) => Number(d)).filter((n: number) => !isNaN(n)) : [],
          horaAbertura: horaAbertura ?? null,
          horaFechamento: horaFechamento ?? null,
          aberto: Boolean(aberto) || false,
          freteGratisAtivado: freteGratisAtivado !== undefined ? Boolean(freteGratisAtivado) : false,
          valorMinimoFreteGratis: valorMinimoFreteGratis !== undefined && valorMinimoFreteGratis !== null && valorMinimoFreteGratis !== '' 
            ? Number(valorMinimoFreteGratis) 
            : null,
        },
        include: { categorias: true },
      });
      res.status(201).json(estabelecimento);
      return;
    } catch (error) {
      res.status(400).json({ error: 'Erro ao criar estabelecimento', details: error });
      return;
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { nome, descricao, endereco, latitude, longitude, tempoEntregaMin, tempoEntregaMax, taxaEntrega, categorias, diasAbertos, horaAbertura, horaFechamento, aberto, freteGratisAtivado, valorMinimoFreteGratis } = req.body;
      
      console.log('📝 Dados recebidos no update:', {
        id,
        freteGratisAtivado,
        valorMinimoFreteGratis,
        tipoFreteGratis: typeof freteGratisAtivado,
        tipoValorMinimo: typeof valorMinimoFreteGratis
      });
      if (categorias && categorias.length > 3) {
        res.status(400).json({ error: 'Selecione no máximo 3 categorias.' });
        return;
      }
      let categoriaConnect = [];
      if (categorias && categorias.length > 0) {
        categoriaConnect = await Promise.all(
          categorias.map(async (nome: string) => {
            let cat = await prisma.categoria.findUnique({ where: { nome } });
            if (!cat) cat = await prisma.categoria.create({ data: { nome } });
            return { id: cat.id };
          })
        );
      }
      // Preparar dados de atualização apenas com campos válidos
      const updateData: any = {};
      
      if (nome !== undefined) updateData.nome = nome;
      if (descricao !== undefined) updateData.descricao = descricao;
      if (endereco !== undefined) updateData.endereco = endereco;
      if (latitude !== undefined) updateData.latitude = latitude;
      if (longitude !== undefined) updateData.longitude = longitude;
      if (tempoEntregaMin !== undefined) updateData.tempoEntregaMin = tempoEntregaMin;
      if (tempoEntregaMax !== undefined) updateData.tempoEntregaMax = tempoEntregaMax;
      if (taxaEntrega !== undefined) updateData.taxaEntrega = taxaEntrega;
      if (categorias) updateData.categorias = { set: categoriaConnect };
      if (diasAbertos !== undefined && Array.isArray(diasAbertos)) {
        updateData.diasAbertos = diasAbertos.map((d: any) => Number(d)).filter((n: number) => !isNaN(n));
      }
      if (horaAbertura !== undefined && typeof horaAbertura === 'string') updateData.horaAbertura = horaAbertura;
      if (horaFechamento !== undefined && typeof horaFechamento === 'string') updateData.horaFechamento = horaFechamento;
      if (typeof aberto === 'boolean') updateData.aberto = aberto;
      
      // Tratar campos de frete grátis - SEMPRE atualizar se enviado
      // Isso garante que false também seja salvo (não apenas true)
      if (freteGratisAtivado !== undefined) {
        updateData.freteGratisAtivado = Boolean(freteGratisAtivado);
        console.log('✅ freteGratisAtivado será atualizado para:', updateData.freteGratisAtivado);
      } else {
        console.log('⚠️ freteGratisAtivado não foi enviado (undefined)');
      }
      
      // Tratar valorMinimoFreteGratis - SEMPRE atualizar se enviado (incluindo null)
      if (valorMinimoFreteGratis !== undefined) {
        if (valorMinimoFreteGratis === null || valorMinimoFreteGratis === '' || valorMinimoFreteGratis === 'null') {
          updateData.valorMinimoFreteGratis = null;
          console.log('✅ valorMinimoFreteGratis será atualizado para: null');
        } else {
          const valor = Number(valorMinimoFreteGratis);
          if (!isNaN(valor) && valor > 0) {
            updateData.valorMinimoFreteGratis = valor;
            console.log('✅ valorMinimoFreteGratis será atualizado para:', valor);
          } else {
            updateData.valorMinimoFreteGratis = null;
            console.log('⚠️ valorMinimoFreteGratis inválido, será atualizado para: null');
          }
        }
      } else {
        console.log('⚠️ valorMinimoFreteGratis não foi enviado (undefined)');
      }
      
      console.log('📦 Dados de atualização preparados:', JSON.stringify(updateData, null, 2));
      
      const estabelecimento = await prisma.estabelecimento.update({
        where: { id: Number(id) },
        data: updateData,
        include: { categorias: true },
      });
      
      console.log('✅ Estabelecimento atualizado:', {
        id: estabelecimento.id,
        freteGratisAtivado: estabelecimento.freteGratisAtivado,
        valorMinimoFreteGratis: estabelecimento.valorMinimoFreteGratis
      });
      
      res.json(estabelecimento);
      return;
    } catch (error: any) {
      console.error('Erro ao atualizar estabelecimento:', error);
      const errorMessage = error?.message || 'Erro ao atualizar estabelecimento';
      const errorDetails = error?.meta || error?.code || error;
      res.status(400).json({ error: errorMessage, details: errorDetails });
      return;
    }
  }

  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const estabelecimentos = await prisma.estabelecimento.findMany({
        include: { categorias: true },
        orderBy: [{ aberto: 'desc' }, { nome: 'asc' }],
      });
      res.json(estabelecimentos);
      return;
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar estabelecimentos', details: error });
      return;
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const estabelecimento = await prisma.estabelecimento.findUnique({
        where: { id: Number(id) },
        include: { categorias: true },
      });
      if (!estabelecimento) {
        res.status(404).json({ error: 'Estabelecimento não encontrado' });
        return;
      }
      res.json(estabelecimento);
      return;
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar estabelecimento', details: error });
      return;
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await prisma.estabelecimento.delete({
        where: { id: Number(id) },
      });
      res.status(204).send();
      return;
    } catch (error) {
      res.status(400).json({ error: 'Erro ao deletar estabelecimento', details: error });
      return;
    }
  }

  static async listByDono(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      if (!user || user.role !== 'dono') {
        res.status(403).json({ error: 'Apenas donos podem acessar seus estabelecimentos.' });
        return;
      }
      const estabelecimentos = await prisma.estabelecimento.findMany({
        where: { donoId: user.id },
        include: { categorias: true }, // Garante que imagem seja incluída
      });
      // Prisma já retorna o campo imagem se ele existir no schema e no banco
      res.json(estabelecimentos);
      return;
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar estabelecimentos do dono', details: error });
      return;
    }
  }

  static async setAberto(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { aberto } = req.body as { aberto: boolean };
      const user = (req as any).user;
      if (!user || user.role !== 'dono') {
        res.status(403).json({ error: 'Apenas donos podem alterar disponibilidade.' });
        return;
      }
      const estabelecimento = await prisma.estabelecimento.update({
        where: { id: Number(id) },
        data: { aberto },
        include: { categorias: true },
      });
      res.json(estabelecimento);
      return;
    } catch (error) {
      res.status(400).json({ error: 'Erro ao atualizar disponibilidade', details: error });
      return;
    }
  }

  static async avaliar(req: Request, res: Response): Promise<void> {
    try {
      console.log('Middleware user:', req.user); // Log the user object from middleware
      const { estabelecimentoId, nota, comentario } = req.body;
      const usuarioId = (req as any).user?.id; // Use authenticated user's ID

      console.log('Received data:', { estabelecimentoId, nota, comentario, usuarioId });

      if (!estabelecimentoId || nota === undefined || nota === null) {
        res.status(400).json({ error: 'Campos obrigatórios: estabelecimentoId, nota' });
        return;
      }

      if (nota < 0 || nota > 5) {
        res.status(400).json({ error: 'A nota deve estar entre 0 e 5.' });
        return;
      }

      // Ensure IDs are integers
      const estabelecimentoIdInt = parseInt(estabelecimentoId, 10);
      const usuarioIdInt = parseInt(usuarioId, 10);

      console.log('Parsed IDs:', { estabelecimentoIdInt, usuarioIdInt });

      if (isNaN(estabelecimentoIdInt) || isNaN(usuarioIdInt)) {
        res.status(400).json({ error: 'IDs inválidos.' });
        return;
      }

      // Validate existence of estabelecimentoId
      const estabelecimento = await prisma.estabelecimento.findUnique({
        where: { id: estabelecimentoIdInt },
      });
      if (!estabelecimento) {
        res.status(404).json({ error: 'Estabelecimento não encontrado' });
        return;
      }

      // Validate existence of usuarioId
      const usuario = await prisma.usuario.findUnique({
        where: { id: usuarioIdInt },
      });
      if (!usuario) {
        res.status(404).json({ error: 'Usuário não encontrado' });
        return;
      }

      // Cria avaliação
      const avaliacao = await prisma.avaliacao.create({
        data: { estabelecimentoId: estabelecimentoIdInt, usuarioId: usuarioIdInt, nota, comentario },
      });

      // Atualiza média e count
      const stats = await prisma.avaliacao.aggregate({
        where: { estabelecimentoId: estabelecimentoIdInt },
        _avg: { nota: true },
        _count: { id: true },
      });
      await prisma.estabelecimento.update({
        where: { id: estabelecimentoIdInt },
        data: {
          avaliacao: stats._avg.nota || 0,
          avaliacoesCount: stats._count.id,
        },
      });

      res.status(201).json(avaliacao);
    } catch (error) {
      console.error('Erro ao registrar avaliação:', error);
      res.status(500).json({ error: 'Erro ao registrar avaliação', details: error });
    }
  }

  static async getAvaliacoes(req: Request, res: Response): Promise<void> {
    try {
      const { estabelecimentoId } = req.params;
      const avaliacoes = await prisma.avaliacao.findMany({
        where: { estabelecimentoId: Number(estabelecimentoId) },
        include: { usuario: { select: { nome: true } } },
        orderBy: { createdAt: 'desc' },
      });
      res.json(avaliacoes);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar avaliações', details: error });
    }
  }
}
