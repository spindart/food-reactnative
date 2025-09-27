  import { Request, Response } from 'express';
  import { PrismaClient } from '@prisma/client';

  const prisma = new PrismaClient();

  export class AddressController {
  static async setDefault(req: Request, res: Response): Promise<void> {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    const { id } = req.params;
    // Remove isDefault de todos os endereços do usuário
    await prisma.address.updateMany({
      where: { usuarioId: user.id },
      data: { isDefault: false },
    });
    // Marca o endereço selecionado como padrão
    const addr = await prisma.address.update({
      where: { id: Number(id) },
      data: { isDefault: true },
    });
    res.json(addr);
  }
  static async list(req: Request, res: Response): Promise<void> {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    const addresses = await prisma.address.findMany({ where: { usuarioId: user.id } });
    res.json(addresses);
  }

  static async create(req: Request, res: Response): Promise<void> {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    const { label, address, latitude, longitude } = req.body;
    // Verifica se já existe algum endereço para o usuário
    const count = await prisma.address.count({ where: { usuarioId: user.id } });
    const addr = await prisma.address.create({
      data: {
        usuarioId: user.id,
        label,
        address,
        latitude,
        longitude,
        isDefault: count === 0, // Se for o primeiro, já salva como padrão
      },
    });
    res.status(201).json(addr);
  }

  static async update(req: Request, res: Response): Promise<void> {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    const { id } = req.params;
    const { label, address, latitude, longitude } = req.body;
    const addr = await prisma.address.update({
      where: { id: Number(id) },
      data: { label, address, latitude, longitude },
    });
    res.json(addr);
  }

  static async remove(req: Request, res: Response): Promise<void> {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    const { id } = req.params;
    await prisma.address.delete({ where: { id: Number(id) } });
    res.status(204).send();
  }
}
