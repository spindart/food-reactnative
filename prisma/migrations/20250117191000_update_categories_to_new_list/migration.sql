-- Remove todas as categorias existentes
DELETE FROM "Categoria";

-- Adiciona as novas categorias
INSERT INTO "Categoria" ("nome") VALUES 
('Restaurante – refeição pronta'),
('Lanches / Burgers / Pizza'),
('Marmitas / comida caseira'),
('Padaria / Café da manhã'),
('Mercado / Mercearia'),
('Farmácia / Higiene'),
('Pet shop'),
('Saudável / Vegana / Vegetariana'),
('Sobremesas / Açaí / Doces');
