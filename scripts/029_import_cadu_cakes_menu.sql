-- Cadu Cakes & Lanches - importacao de cardapio a partir de cadu_cakes_menu.json
-- Requisitos aplicados:
-- 1) Apaga categorias e itens atuais
-- 2) Recria categorias vindas do JSON
-- 3) Nao usa emoji no nome das categorias
-- 4) Preenche campos PT/EN (nome, nome_en, descricao, descricao_en)

BEGIN;

DELETE FROM public.itens_cardapio;
DELETE FROM public.categorias;

INSERT INTO public.categorias (id, nome, icone, ordem, ativo) VALUES
  ('cd000000-0000-4000-8000-000000000001'::uuid, 'Lanches', NULL, 1, true),
  ('cd000000-0000-4000-8000-000000000002'::uuid, 'Salgados', NULL, 2, true),
  ('cd000000-0000-4000-8000-000000000003'::uuid, 'Porções', NULL, 3, true),
  ('cd000000-0000-4000-8000-000000000004'::uuid, 'Pratos', NULL, 4, true),
  ('cd000000-0000-4000-8000-000000000005'::uuid, 'Açaí', NULL, 5, true),
  ('cd000000-0000-4000-8000-000000000006'::uuid, 'Bebidas', NULL, 6, true);

INSERT INTO public.itens_cardapio (
  categoria_id, nome, nome_en, descricao, descricao_en, preco, imagem_url, disponivel, destaque, ordem
) VALUES
  -- Lanches
  ('cd000000-0000-4000-8000-000000000001'::uuid, 'X-Tudo', 'X-Everything Burger', 'Pão, maionese, milho, alface, tomate, queijo, presunto, bacon, ovo, hamburguer e batata palha', 'Bread, mayonnaise, corn, lettuce, tomato, cheese, ham, bacon, egg, hamburger, and crispy shoestring potatoes', 13.99, NULL, true, false, 1),
  ('cd000000-0000-4000-8000-000000000001'::uuid, 'X-Tudo Frango', 'Chicken X-Everything Burger', 'Pão, maionese, milho, alface, tomate, queijo, presunto, bacon, ovo, hamburguer de frango e batata palha', 'Bread, mayonnaise, corn, lettuce, tomato, cheese, ham, bacon, egg, chicken burger, and crispy shoestring potatoes', 13.49, NULL, true, false, 2),
  ('cd000000-0000-4000-8000-000000000001'::uuid, 'X-Tudo Calabresa', 'Sausage X-Everything Burger', 'Pão, maionese, milho, alface, tomate, queijo, presunto, bacon, ovo, calabresa e batata palha', 'Bread, mayonnaise, corn, lettuce, tomato, cheese, ham, bacon, egg, sausage, and crispy shoestring potatoes', 13.99, NULL, true, false, 3),
  ('cd000000-0000-4000-8000-000000000001'::uuid, 'X-Tudo Picanha', 'Picanha X-Everything Burger', 'Pão, maionese, milho, alface, tomate, queijo, presunto, bacon, ovo, picanha picada e batata palha', 'Bread, mayonnaise, corn, lettuce, tomato, cheese, ham, bacon, egg, chopped picanha steak, and crispy shoestring potatoes', 13.99, NULL, true, false, 4),
  ('cd000000-0000-4000-8000-000000000001'::uuid, 'X-Tropical', 'Tropical Burger', 'Pão, maionese, milho, alface, tomate, queijo, presunto, bacon, ovo, abacaxi, hamburguer de frango, hamburguer de carne e batata palha', 'Bread, mayonnaise, corn, lettuce, tomato, cheese, ham, bacon, egg, pineapple, chicken burger, beef burger, and crispy shoestring potatoes', 17.99, NULL, true, false, 5),
  ('cd000000-0000-4000-8000-000000000001'::uuid, 'Triple X + batata + lata', 'Triple X + fries + soda', 'Pão, maionese, milho, alface, tomate, 3x queijo, 3x presunto, 3x bacon, 3x ovo, 3x hamburguer e batata palha', 'Bread, mayonnaise, corn, lettuce, tomato, triple cheese, triple ham, triple bacon, triple egg, triple hamburger, and crispy shoestring potatoes', 22.99, NULL, true, false, 6),
  ('cd000000-0000-4000-8000-000000000001'::uuid, 'X-Frango', 'Chicken Burger', 'Pão, maionese, milho, alface, tomate, queijo, presunto e hamburguer de frango', 'Bread, mayonnaise, corn, lettuce, tomato, cheese, ham, and chicken burger', 11.49, NULL, true, false, 7),
  ('cd000000-0000-4000-8000-000000000001'::uuid, 'X-Calabresa', 'Sausage Burger', 'Pão, maionese, milho, alface, tomate, queijo, presunto e calabresa', 'Bread, mayonnaise, corn, lettuce, tomato, cheese, ham, and sausage', 12.49, NULL, true, false, 8),
  ('cd000000-0000-4000-8000-000000000001'::uuid, 'X-Picanha', 'Picanha Burger', 'Pão, maionese, milho, alface, tomate, queijo, presunto e picanha picada', 'Bread, mayonnaise, corn, lettuce, tomato, cheese, ham, and chopped picanha steak', 12.99, NULL, true, false, 9),
  ('cd000000-0000-4000-8000-000000000001'::uuid, 'X-Egg', 'Egg Burger', 'Pão, maionese, milho, alface, tomate, queijo, presunto, ovo e hamburguer', 'Bread, mayonnaise, corn, lettuce, tomato, cheese, ham, egg, and hamburger', 11.49, NULL, true, false, 10),
  ('cd000000-0000-4000-8000-000000000001'::uuid, 'X-Salada', 'Salad Burger', 'Pão, maionese, milho, alface, tomate, queijo, presunto e hamburguer', 'Bread, mayonnaise, corn, lettuce, tomato, cheese, ham, and hamburger', 10.49, NULL, true, false, 11),
  ('cd000000-0000-4000-8000-000000000001'::uuid, 'X-Burguer', 'Basic Burger', 'Pão, maionese, milho, queijo e hamburguer', 'Bread, mayonnaise, corn, cheese, and hamburger', 8.49, NULL, true, false, 12),
  ('cd000000-0000-4000-8000-000000000001'::uuid, 'X-Bacon', 'Bacon Burger', 'Pão, maionese, milho, alface, tomate, queijo, presunto, bacon e hamburguer', 'Bread, mayonnaise, corn, lettuce, tomato, cheese, ham, bacon, and hamburger', 11.49, NULL, true, false, 13),

  -- Salgados
  ('cd000000-0000-4000-8000-000000000002'::uuid, 'Pastel de Queijo', 'Cheese Pastry', NULL, NULL, 5.99, NULL, true, false, 1),
  ('cd000000-0000-4000-8000-000000000002'::uuid, 'Pastel de Carne', 'Beef Pastry', NULL, NULL, 5.99, NULL, true, false, 2),
  ('cd000000-0000-4000-8000-000000000002'::uuid, 'Pastel de Carne Queijo', 'Beef and Cheese Pastry', NULL, NULL, 5.99, NULL, true, false, 3),
  ('cd000000-0000-4000-8000-000000000002'::uuid, 'Pastel de Frango Catupiry', 'Chicken and Catupiry Pastry', NULL, NULL, 5.99, NULL, true, false, 4),
  ('cd000000-0000-4000-8000-000000000002'::uuid, 'Pastel de Frango', 'Chicken Pastry', NULL, NULL, 5.99, NULL, true, false, 5),
  ('cd000000-0000-4000-8000-000000000002'::uuid, 'Coxinha', 'Chicken Croquette', NULL, NULL, 5.00, NULL, true, false, 6),
  ('cd000000-0000-4000-8000-000000000002'::uuid, 'Kibe', 'Kibbeh', NULL, NULL, 5.00, NULL, true, false, 7),
  ('cd000000-0000-4000-8000-000000000002'::uuid, 'Coxinha com Catupiry', 'Chicken and Catupiry Croquette', NULL, NULL, 5.50, NULL, true, false, 8),
  ('cd000000-0000-4000-8000-000000000002'::uuid, 'Risole de Carne', 'Beef Rissole', NULL, NULL, 5.50, NULL, true, false, 9),
  ('cd000000-0000-4000-8000-000000000002'::uuid, 'Enroladinho de Presunto e Queijo', 'Ham and Cheese Roll', NULL, NULL, 5.50, NULL, true, false, 10),
  ('cd000000-0000-4000-8000-000000000002'::uuid, 'Enroladinho de Salsicha', 'Hot Dog Roll', NULL, NULL, 5.50, NULL, true, false, 11),

  -- Porções
  ('cd000000-0000-4000-8000-000000000003'::uuid, 'Porção de Mandioca frita', 'Fried Cassava Portion', NULL, NULL, 9.50, NULL, true, false, 1),
  ('cd000000-0000-4000-8000-000000000003'::uuid, 'Porção de Batata Frita Média', 'Medium French Fries Portion', NULL, NULL, 10.00, NULL, true, false, 2),
  ('cd000000-0000-4000-8000-000000000003'::uuid, 'Porção de Batata Frita Grande', 'Large French Fries Portion', NULL, NULL, 15.00, NULL, true, false, 3),
  ('cd000000-0000-4000-8000-000000000003'::uuid, 'Porção de Frango a Passarinho', 'Fried Chicken Bites Portion', NULL, NULL, 24.99, NULL, true, false, 4),
  ('cd000000-0000-4000-8000-000000000003'::uuid, 'Porção de Batata Frita com Bacon e Cheddar', 'French Fries with Bacon and Cheddar Portion', NULL, NULL, 18.99, NULL, true, false, 5),
  ('cd000000-0000-4000-8000-000000000003'::uuid, 'Porção de Churrasquinho', 'Grilled Skewer Portion', 'Frango, alcatra, calabresa e cebola. Acompanha batata ou mandioca', 'Chicken, top sirloin, sausage and onion. Served with fries or cassava', 23.99, NULL, true, false, 6),
  ('cd000000-0000-4000-8000-000000000003'::uuid, 'Porção de Filé de Frango', 'Grilled Chicken Fillet Portion', 'Filé de frango e cebola. Acompanha batata ou mandioca', 'Chicken fillet and onion. Served with fries or cassava', 21.99, NULL, true, false, 7),
  ('cd000000-0000-4000-8000-000000000003'::uuid, 'Porção de Alcatra', 'Top Sirloin Steak Portion', 'Alcatra e cebola. Acompanha batata ou mandioca', 'Top sirloin and onion. Served with fries or cassava', 24.99, NULL, true, false, 8),
  ('cd000000-0000-4000-8000-000000000003'::uuid, 'Porção de Calabresa', 'Grilled Sausage Portion', 'Calabresa e cebola. Acompanha batata ou mandioca', 'Sausage and onion. Served with fries or cassava', 22.99, NULL, true, false, 9),

  -- Pratos
  ('cd000000-0000-4000-8000-000000000004'::uuid, 'Bife à cavalo', 'Steak with Fried Egg', 'Arroz, feijão, ovo frito, batata frita e salada', 'Rice, beans, fried egg, French fries and salad', 14.99, NULL, true, false, 1),
  ('cd000000-0000-4000-8000-000000000004'::uuid, 'Frango à cavalo', 'Chicken with Fried Egg', 'Arroz, feijão, frango, ovo frito, batata frita e salada', 'Rice, beans, chicken, fried egg, French fries and salad', 14.99, NULL, true, false, 2),

  -- Açaí
  ('cd000000-0000-4000-8000-000000000005'::uuid, 'Monte o Seu', 'Build Your Own', 'Escolha até 5 complementos do cardápio', 'Choose up to 5 toppings from the menu', 11.00, NULL, true, false, 1),
  ('cd000000-0000-4000-8000-000000000005'::uuid, 'Açaí - Escolha o Tamanho e o Sabor', 'Açaí – Choose the Size and Flavor', NULL, NULL, 11.00, NULL, true, false, 2),

  -- Bebidas
  ('cd000000-0000-4000-8000-000000000006'::uuid, 'Coca-cola lata', NULL, NULL, NULL, 2.50, NULL, true, false, 1),
  ('cd000000-0000-4000-8000-000000000006'::uuid, 'Fanta laranja lata', NULL, NULL, NULL, 2.50, NULL, true, false, 2),
  ('cd000000-0000-4000-8000-000000000006'::uuid, 'Guaraná antartica lata', NULL, NULL, NULL, 2.50, NULL, true, false, 3),
  ('cd000000-0000-4000-8000-000000000006'::uuid, 'Guaraná antartica diet lata', NULL, NULL, NULL, 2.50, NULL, true, false, 4),
  ('cd000000-0000-4000-8000-000000000006'::uuid, 'Ginger ale Canada Dry lata', NULL, NULL, NULL, 2.50, NULL, true, false, 5),
  ('cd000000-0000-4000-8000-000000000006'::uuid, 'Sprite lata', NULL, NULL, NULL, 2.00, NULL, true, false, 6),
  ('cd000000-0000-4000-8000-000000000006'::uuid, 'Coca-cola 600ml', NULL, NULL, NULL, 3.50, NULL, true, false, 7),
  ('cd000000-0000-4000-8000-000000000006'::uuid, 'Guaraná antartica 600ml', NULL, NULL, NULL, 3.50, NULL, true, false, 8),
  ('cd000000-0000-4000-8000-000000000006'::uuid, 'Coca-cola 2L', NULL, NULL, NULL, 5.00, NULL, true, false, 9),
  ('cd000000-0000-4000-8000-000000000006'::uuid, 'Guaraná antartica 2L', NULL, NULL, NULL, 5.00, NULL, true, false, 10),
  ('cd000000-0000-4000-8000-000000000006'::uuid, 'Fanta laranja 2L', NULL, NULL, NULL, 5.00, NULL, true, false, 11),
  ('cd000000-0000-4000-8000-000000000006'::uuid, 'Red bull', NULL, NULL, NULL, 4.50, NULL, true, false, 12),
  ('cd000000-0000-4000-8000-000000000006'::uuid, 'Monster', NULL, NULL, NULL, 3.50, NULL, true, false, 13),
  ('cd000000-0000-4000-8000-000000000006'::uuid, 'Toddynho', NULL, NULL, NULL, 2.00, NULL, true, false, 14),
  ('cd000000-0000-4000-8000-000000000006'::uuid, 'Suco Pura Fruta Maracujá', NULL, NULL, NULL, 3.00, NULL, true, false, 15),
  ('cd000000-0000-4000-8000-000000000006'::uuid, 'Suco Pura Fruta Goiaba', NULL, NULL, NULL, 3.00, NULL, true, false, 16),
  ('cd000000-0000-4000-8000-000000000006'::uuid, 'Suco Pura Fruta Graviola', NULL, NULL, NULL, 3.00, NULL, true, false, 17),
  ('cd000000-0000-4000-8000-000000000006'::uuid, 'Suco Pura Fruta cajú e cajá', NULL, NULL, NULL, 3.00, NULL, true, false, 18),
  ('cd000000-0000-4000-8000-000000000006'::uuid, 'Suco Pura Fruta limão', NULL, NULL, NULL, 3.00, NULL, true, false, 19),
  ('cd000000-0000-4000-8000-000000000006'::uuid, 'Suco Pura Fruta Piña colada', NULL, NULL, NULL, 3.00, NULL, true, false, 20),
  ('cd000000-0000-4000-8000-000000000006'::uuid, 'Sucos Naturais', NULL, NULL, NULL, 4.99, NULL, true, false, 21),
  ('cd000000-0000-4000-8000-000000000006'::uuid, 'Vitamina Pequena', NULL, NULL, NULL, 6.99, NULL, true, false, 22),
  ('cd000000-0000-4000-8000-000000000006'::uuid, 'Vitamina Grande', NULL, NULL, NULL, 11.99, NULL, true, false, 23);

COMMIT;

