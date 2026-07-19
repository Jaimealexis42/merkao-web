'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { calcularPrecios, fmt, ARANCELES } from '@/lib/precios'
import { useAuth } from '@/lib/useAuth'
import { T, CAT_NAMES, type Lang } from '@/lib/translations'
import { useCarritoStore } from '@/src/store/carritoStore'
import { Icon, type IconName } from '@/lib/icons'
import { DEPARTAMENTOS_PERU } from '@/lib/peru-geo'
import TrackPageView from '@/components/TrackPageView'

/* ─────────────────────────── CONSTANTES ─────────────────────────── */

type CatDef = { id: number; icon: IconName; accent?: boolean }

const CATEGORIAS: CatDef[] = [
  { id: 1, icon: 'shirt' },
  { id: 2, icon: 'smartphone' },
  { id: 3, icon: 'food' },
  { id: 4, icon: 'palette' },
  { id: 5, icon: 'home' },
  { id: 6, icon: 'car' },
  { id: 7, icon: 'sprout' },
  { id: 8, icon: 'box' },
]

const CAT_SLUG: Record<number, string> = {
  1: 'ropa-y-moda',
  2: 'electronicos',
  3: 'alimentos',
  4: 'artesanias',
  5: 'hogar',
  6: 'autos-y-motos',
  7: 'agricola',
  8: 'otros',
}

type HeroTheme = 'terra' | 'stone' | 'jungle' | 'gold' | 'desert' | 'peru'
type Slide = {
  id: string
  theme: HeroTheme
  tag: Record<Lang, string>
  region: string
  title: Record<Lang, string[]> // líneas
  sub: Record<Lang, string>
  body: Record<Lang, string>
  cta: Record<Lang, string>
  ctaHref?: string // si está presente, el CTA navega a esta URL en vez de hacer scroll al shop
  img: string
  categoriaId: number // para filtrar productos cuando el usuario hace click en el CTA
}

// ══════════════════════════════════════════════════════════════════════
// ROTACIÓN AUTOMÁTICA DE 7 SETS DE HERO (cambia cada 1 día)
// ──────────────────────────────────────────────────────────────────────
// Ciclo de 7 días: cada día muestra un set distinto.
//   indiceSet = diasTranscurridos % 7
// Determinístico: misma fecha → mismo set, sin cron ni DB.
//
// ══════════════════════════════════════════════════════════════════════

// UTC para evitar que SSR (Vercel UTC) y cliente (timezone local) difieran.
const FECHA_BASE   = new Date('2026-06-24T00:00:00Z')
const DIAS_POR_SET = 1
const MS_POR_DIA   = 1000 * 60 * 60 * 24

// ─── SET 1 ─ Fiestas Patrias: moda y electrónicos ────────────────────
const SET_1: Slide[] = [
  {
    id: 's1-polo',
    theme: 'peru',
    tag:    { es: 'EDICIÓN 28 DE JULIO', en: 'JULY 28 EDITION', pt: 'EDIÇÃO 28 DE JULHO' },
    region: 'Algodón pima peruano',
    title:  { es: ['Polos del Perú', 'para el 28'], en: ['Peruvian polos', 'for July 28'], pt: ['Polos do Peru', 'para o 28'] },
    sub:    { es: 'Ropa peruana en rojo y blanco', en: 'Peruvian clothing in red and white', pt: 'Roupas peruanas em vermelho e branco' },
    body:   { es: 'Las mejores prendas para celebrar la independencia con orgullo.', en: 'The finest garments to celebrate independence with pride.', pt: 'As melhores roupas para celebrar a independência com orgulho.' },
    cta:    { es: 'Ver moda', en: 'See fashion', pt: 'Ver moda' },
    img:    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&q=80&auto=format&fit=crop',
    categoriaId: 1,
  },
  {
    id: 's1-bandera',
    theme: 'peru',
    tag:    { es: 'MODA PATRIA', en: 'PATRIOTIC STYLE', pt: 'MODA PATRIÓTICA' },
    region: 'Ropa y accesorios',
    title:  { es: ['Luce los colores', 'de tu bandera'], en: ['Wear the colors', 'of your flag'], pt: ['Vista as cores', 'da sua bandeira'] },
    sub:    { es: 'Prendas en rojo y blanco para el 28', en: 'Red and white outfits for July 28', pt: 'Roupas em vermelho e branco para o 28' },
    body:   { es: 'Vestite de fiesta nacional con ropa hecha en el Perú.', en: 'Dress for the national holiday with garments made in Peru.', pt: 'Vista-se para a festa nacional com roupas feitas no Peru.' },
    cta:    { es: 'Ver ropa', en: 'See clothing', pt: 'Ver roupas' },
    img:    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1600&q=80&auto=format&fit=crop',
    categoriaId: 1,
  },
  {
    id: 's1-tech',
    theme: 'stone',
    tag:    { es: 'TECNOLOGÍA', en: 'ELECTRONICS', pt: 'TECNOLOGIA' },
    region: 'Electrónicos',
    title:  { es: ['Electrónicos', 'a precio peruano'], en: ['Electronics', 'at Peruvian prices'], pt: ['Eletrônicos', 'a preço peruano'] },
    sub:    { es: 'Laptops, celulares y más — directo de vendedores locales', en: 'Laptops, phones and more — direct from local sellers', pt: 'Laptops, celulares e mais — direto de vendedores locais' },
    body:   { es: 'La mejor tecnología disponible en Merkao, con escrow protegido.', en: 'The best technology available on Merkao, with escrow protection.', pt: 'A melhor tecnologia disponível no Merkao, com escrow protegido.' },
    cta:    { es: 'Ver electrónicos', en: 'See electronics', pt: 'Ver eletrônicos' },
    img:    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1600&q=80&auto=format&fit=crop',
    categoriaId: 2,
  },
  {
    id: 's1-proveedores',
    theme: 'gold',
    tag:    { es: 'MERKAO BUSCA PROVEEDORES', en: 'MERKAO SEEKS SUPPLIERS', pt: 'MERKAO BUSCA FORNECEDORES' },
    region: 'Vendé sin comisiones',
    title:  { es: ['Vendé gratis', '1 año en', 'Merkao'], en: ['Sell free', '1 year on', 'Merkao'], pt: ['Venda grátis', '1 ano no', 'Merkao'] },
    sub:    { es: '0% comisión durante los primeros 12 meses', en: '0% commission for the first 12 months', pt: '0% comissão nos primeiros 12 meses' },
    body:   { es: 'Llegá a compradores de todo el Perú desde el día 1, sin pagar comisiones.', en: 'Reach buyers across Peru from day 1, without paying commissions.', pt: 'Alcance compradores em todo o Peru desde o dia 1, sem pagar comissões.' },
    cta:    { es: 'Quiero vender', en: 'I want to sell', pt: 'Quero vender' },
    ctaHref: '/register?role=vendedor',
    img:    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1600&q=80&auto=format&fit=crop',
    categoriaId: 0,
  },
]

// ─── SET 2 ─ Sabores del Perú: cacao, café, quinua ───────────────────
const SET_2: Slide[] = [
  {
    id: 's2-cacao',
    theme: 'terra',
    tag:    { es: 'CACAO DE AMAZONAS', en: 'AMAZON CACAO', pt: 'CACAU DA AMAZÔNIA' },
    region: 'Amazonas · San Martín',
    title:  { es: ['Cacao puro', 'de Amazonas'], en: ['Pure cacao', 'from the Amazon'], pt: ['Cacau puro', 'da Amazônia'] },
    sub:    { es: 'Chocolate y cacao orgánico peruano', en: 'Organic Peruvian chocolate and cacao', pt: 'Chocolate e cacau orgânico peruano' },
    body:   { es: 'El mejor cacao del mundo viene del Perú — encontralo en Merkao.', en: "The world's best cacao comes from Peru — find it on Merkao.", pt: 'O melhor cacau do mundo vem do Peru — encontre no Merkao.' },
    cta:    { es: 'Ver alimentos', en: 'See food', pt: 'Ver alimentos' },
    img:    'https://images.unsplash.com/photo-1606312619070-d48b9d92b3f4?w=1600&q=80&auto=format&fit=crop',
    categoriaId: 3,
  },
  {
    id: 's2-cafe',
    theme: 'terra',
    tag:    { es: 'CAFÉ DE ALTURA', en: 'HIGH-ALTITUDE COFFEE', pt: 'CAFÉ DE ALTITUDE' },
    region: 'Cajamarca · Cusco',
    title:  { es: ['Café peruano', 'de altura'], en: ['Peruvian coffee', 'from the highlands'], pt: ['Café peruano', 'de altitude'] },
    sub:    { es: 'Granos cultivados sobre los 1,500 msnm', en: 'Beans grown above 1,500 m above sea level', pt: 'Grãos cultivados acima de 1.500 m de altitude' },
    body:   { es: 'El café peruano ganó premios mundiales — pedilo directo del productor.', en: 'Peruvian coffee has won world awards — order it direct from the producer.', pt: 'O café peruano ganhou prêmios mundiais — peça direto do produtor.' },
    cta:    { es: 'Ver alimentos', en: 'See food', pt: 'Ver alimentos' },
    img:    'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=1600&q=80&auto=format&fit=crop',
    categoriaId: 3,
  },
  {
    id: 's2-quinua',
    theme: 'terra',
    tag:    { es: 'SUPERALIMENTOS ANDINOS', en: 'ANDEAN SUPERFOODS', pt: 'SUPERALIMENTOS ANDINOS' },
    region: 'Puno · Cusco · Arequipa',
    title:  { es: ['Quinua y granos', 'andinos'], en: ['Quinoa and', 'Andean grains'], pt: ['Quinoa e grãos', 'andinos'] },
    sub:    { es: 'Kiwicha, cañihua, maca y más superalimentos', en: 'Kiwicha, cañihua, maca and more superfoods', pt: 'Kiwicha, cañihua, maca e mais superalimentos' },
    body:   { es: 'Los superalimentos más potentes del planeta, cultivados en los Andes peruanos.', en: "The planet's most powerful superfoods, grown in the Peruvian Andes.", pt: 'Os superalimentos mais poderosos do planeta, cultivados nos Andes peruanos.' },
    cta:    { es: 'Ver alimentos', en: 'See food', pt: 'Ver alimentos' },
    img:    'https://images.unsplash.com/photo-1547592180-85f173990554?w=1600&q=80&auto=format&fit=crop',
    categoriaId: 3,
  },
  {
    id: 's2-registro',
    theme: 'gold',
    tag:    { es: '¿VENDÉS PRODUCTOS?', en: 'DO YOU SELL PRODUCTS?', pt: 'VOCÊ VENDE PRODUTOS?' },
    region: 'Regístrate gratis',
    title:  { es: ['Registrate', 'en Merkao', '¡Es gratis!'], en: ['Sign up', 'on Merkao', "It's free!"], pt: ['Cadastre-se', 'no Merkao', 'É grátis!'] },
    sub:    { es: 'Vendé tus productos a todo el Perú sin comisiones', en: 'Sell your products across Peru without commissions', pt: 'Venda seus produtos em todo o Peru sem comissões' },
    body:   { es: 'Creá tu tienda gratis hoy y empezá a vender mañana.', en: 'Create your free store today and start selling tomorrow.', pt: 'Crie sua loja grátis hoje e comece a vender amanhã.' },
    cta:    { es: 'Registrarme', en: 'Sign me up', pt: 'Cadastrar-me' },
    ctaHref: '/register',
    img:    'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1600&q=80&auto=format&fit=crop',
    categoriaId: 0,
  },
]

// ─── SET 3 ─ Artesanía y cultura peruana ─────────────────────────────
const SET_3: Slide[] = [
  {
    id: 's3-artesania',
    theme: 'jungle',
    tag:    { es: 'HECHO EN PERÚ', en: 'MADE IN PERU', pt: 'FEITO NO PERU' },
    region: 'Cusco · Puno · Ayacucho',
    title:  { es: ['Artesanía peruana', 'auténtica'], en: ['Authentic', 'Peruvian crafts'], pt: ['Artesanato', 'peruano autêntico'] },
    sub:    { es: 'Textiles, tejidos y cerámica de cada región', en: 'Textiles, weavings and ceramics from every region', pt: 'Têxteis, tecelagens e cerâmicas de cada região' },
    body:   { es: 'Llevate algo hecho con manos peruanas — único, irrepetible.', en: 'Take home something made with Peruvian hands — unique, unrepeatable.', pt: 'Leve para casa algo feito com mãos peruanas — único, inigualável.' },
    cta:    { es: 'Ver artesanías', en: 'See crafts', pt: 'Ver artesanato' },
    img:    'https://images.unsplash.com/photo-1582582494705-f8ce0b0c24f0?w=1600&q=80&auto=format&fit=crop',
    categoriaId: 4,
  },
  {
    id: 's3-textiles',
    theme: 'jungle',
    tag:    { es: 'TEXTILES ANDINOS', en: 'ANDEAN TEXTILES', pt: 'TÊXTEIS ANDINOS' },
    region: 'Tejedores de los Andes',
    title:  { es: ['Textiles y tejidos', 'peruanos'], en: ['Peruvian textiles', 'and weavings'], pt: ['Têxteis e tecelagens', 'peruanos'] },
    sub:    { es: 'Alpaca, lana y algodón nativo de los Andes', en: 'Alpaca, wool and native Andean cotton', pt: 'Alpaca, lã e algodão nativo dos Andes' },
    body:   { es: 'Chales, mantas, alfombras y tapices tejidos a mano por artesanos.', en: 'Shawls, blankets, rugs and tapestries handwoven by artisans.', pt: 'Xales, cobertores, tapetes e tapeçarias tecidos à mão por artesãos.' },
    cta:    { es: 'Ver artesanías', en: 'See crafts', pt: 'Ver artesanato' },
    img:    'https://images.unsplash.com/photo-1544942557-b7a0e50a5d7b?w=1600&q=80&auto=format&fit=crop',
    categoriaId: 4,
  },
  {
    id: 's3-deco',
    theme: 'desert',
    tag:    { es: 'HOGAR Y DECORACIÓN', en: 'HOME & DECORATION', pt: 'CASA E DECORAÇÃO' },
    region: 'Todo el Perú',
    title:  { es: ['Decoración', 'para tu hogar'], en: ['Decoration', 'for your home'], pt: ['Decoração', 'para sua casa'] },
    sub:    { es: 'Muebles y accesorios para cada ambiente', en: 'Furniture and accessories for every room', pt: 'Móveis e acessórios para cada ambiente' },
    body:   { es: 'Transformá tu espacio con productos peruanos de calidad.', en: 'Transform your space with quality Peruvian products.', pt: 'Transforme seu espaço com produtos peruanos de qualidade.' },
    cta:    { es: 'Ver hogar', en: 'See home décor', pt: 'Ver decoração' },
    img:    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1600&q=80&auto=format&fit=crop',
    categoriaId: 5,
  },
  {
    id: 's3-proveedores',
    theme: 'gold',
    tag:    { es: 'TU NEGOCIO MERECE BRILLAR', en: 'YOUR BUSINESS DESERVES TO SHINE', pt: 'SEU NEGÓCIO MERECE BRILHAR' },
    region: 'Emprendedores peruanos',
    title:  { es: ['Tu negocio', 'merece brillar', 'en Merkao'], en: ['Your business', 'deserves', 'to shine'], pt: ['Seu negócio', 'merece', 'brilhar'] },
    sub:    { es: 'Registrá tu tienda y llegá a todo el Perú', en: 'Register your store and reach all of Peru', pt: 'Registre sua loja e alcance todo o Peru' },
    body:   { es: 'Más de 200 vendedores activos confían en Merkao. Únete hoy.', en: 'Over 200 active sellers trust Merkao. Join today.', pt: 'Mais de 200 vendedores ativos confiam no Merkao. Junte-se hoje.' },
    cta:    { es: 'Registra tu tienda', en: 'Register your store', pt: 'Registre sua loja' },
    ctaHref: '/register?role=vendedor',
    img:    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1600&q=80&auto=format&fit=crop',
    categoriaId: 0,
  },
]

// ─── SET 4 ─ Hogar peruano ────────────────────────────────────────────
const SET_4: Slide[] = [
  {
    id: 's4-hogar28',
    theme: 'desert',
    tag:    { es: 'HOGAR FESTIVO', en: 'FESTIVE HOME', pt: 'LAR FESTIVO' },
    region: 'Decoración y muebles',
    title:  { es: ['Decora tu hogar', 'para el 28'], en: ['Decorate your home', 'for July 28'], pt: ['Decore sua casa', 'para o 28'] },
    sub:    { es: 'Muebles y decoración para recibir a la familia', en: 'Furniture and décor to welcome the family', pt: 'Móveis e decoração para receber a família' },
    body:   { es: 'Ambientá tu casa para las fiestas con productos de vendedores peruanos.', en: 'Set up your home for the holidays with products from Peruvian sellers.', pt: 'Prepare sua casa para as festas com produtos de vendedores peruanos.' },
    cta:    { es: 'Ver hogar', en: 'See home', pt: 'Ver casa' },
    img:    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1600&q=80&auto=format&fit=crop',
    categoriaId: 5,
  },
  {
    id: 's4-muebles',
    theme: 'desert',
    tag:    { es: 'MUEBLES Y DECO', en: 'FURNITURE & DÉCOR', pt: 'MÓVEIS E DECORAÇÃO' },
    region: 'Hogar y muebles',
    title:  { es: ['Muebles y', 'decoración'], en: ['Furniture', 'and decoration'], pt: ['Móveis e', 'decoração'] },
    sub:    { es: 'Salas, comedores y dormitorios para cada presupuesto', en: 'Living rooms, dining rooms and bedrooms for every budget', pt: 'Salas, salas de jantar e quartos para cada orçamento' },
    body:   { es: 'Renová tu hogar con muebles de calidad a precios peruanos.', en: 'Renew your home with quality furniture at Peruvian prices.', pt: 'Renove sua casa com móveis de qualidade a preços peruanos.' },
    cta:    { es: 'Ver muebles', en: 'See furniture', pt: 'Ver móveis' },
    img:    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1600&q=80&auto=format&fit=crop',
    categoriaId: 5,
  },
  {
    id: 's4-casa',
    theme: 'desert',
    tag:    { es: 'TODO PARA TU CASA', en: 'EVERYTHING FOR YOUR HOME', pt: 'TUDO PARA SUA CASA' },
    region: 'Hogar completo',
    title:  { es: ['Todo para', 'tu casa'], en: ['Everything', 'for your home'], pt: ['Tudo para', 'sua casa'] },
    sub:    { es: 'Cocina, baño, jardín y más en un solo lugar', en: 'Kitchen, bathroom, garden and more in one place', pt: 'Cozinha, banheiro, jardim e mais em um só lugar' },
    body:   { es: 'Encontrá todo lo que necesitás para tu hogar en Merkao.', en: 'Find everything you need for your home on Merkao.', pt: 'Encontre tudo que você precisa para sua casa no Merkao.' },
    cta:    { es: 'Ver hogar', en: 'See home', pt: 'Ver casa' },
    img:    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1600&q=80&auto=format&fit=crop',
    categoriaId: 5,
  },
  {
    id: 's4-registro',
    theme: 'gold',
    tag:    { es: 'MERKAO NECESITA VENDEDORES', en: 'MERKAO NEEDS SELLERS', pt: 'MERKAO PRECISA DE VENDEDORES' },
    region: 'Gratis por 1 año',
    title:  { es: ['Vendé en Merkao', 'gratis', '1 año entero'], en: ['Sell on Merkao', 'free for', 'a full year'], pt: ['Venda no Merkao', 'grátis', '1 ano inteiro'] },
    sub:    { es: '0% comisión · Sin mensualidad · Sin contrato', en: '0% commission · No monthly fee · No contract', pt: '0% comissão · Sem mensalidade · Sem contrato' },
    body:   { es: 'Publicá tus productos hoy y empezá a recibir pedidos de todo el Perú.', en: 'List your products today and start receiving orders from all over Peru.', pt: 'Publique seus produtos hoje e comece a receber pedidos de todo o Peru.' },
    cta:    { es: 'Registrarme', en: 'Sign me up', pt: 'Cadastrar-me' },
    ctaHref: '/register',
    img:    'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1600&q=80&auto=format&fit=crop',
    categoriaId: 0,
  },
]

// ─── SET 5 ─ Del campo peruano ────────────────────────────────────────
const SET_5: Slide[] = [
  {
    id: 's5-agricola',
    theme: 'jungle',
    tag:    { es: 'DIRECTO DEL PRODUCTOR', en: 'DIRECT FROM PRODUCER', pt: 'DIRETO DO PRODUTOR' },
    region: 'Campos del Perú',
    title:  { es: ['Productos', 'agrícolas frescos'], en: ['Fresh', 'agricultural products'], pt: ['Produtos', 'agrícolas frescos'] },
    sub:    { es: 'Frutas, verduras y tubérculos de productores peruanos', en: 'Fruits, vegetables and tubers from Peruvian producers', pt: 'Frutas, legumes e tubérculos de produtores peruanos' },
    body:   { es: 'Comprá directo al productor — sin intermediarios, más fresco y más barato.', en: 'Buy direct from the producer — no middlemen, fresher and cheaper.', pt: 'Compre direto do produtor — sem intermediários, mais fresco e mais barato.' },
    cta:    { es: 'Ver agrícolas', en: 'See produce', pt: 'Ver agrícolas' },
    img:    'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1600&q=80&auto=format&fit=crop',
    categoriaId: 7,
  },
  {
    id: 's5-productor',
    theme: 'jungle',
    tag:    { es: 'DEL CAMPO A TU MESA', en: 'FROM FIELD TO YOUR TABLE', pt: 'DO CAMPO À SUA MESA' },
    region: 'Productores locales',
    title:  { es: ['Del productor', 'a tu mesa'], en: ['From producer', 'to your table'], pt: ['Do produtor', 'à sua mesa'] },
    sub:    { es: 'Mercado digital de productores peruanos', en: 'Digital marketplace of Peruvian producers', pt: 'Mercado digital de produtores peruanos' },
    body:   { es: 'Apoyá al agricultor peruano comprando directo en Merkao.', en: 'Support the Peruvian farmer by buying directly on Merkao.', pt: 'Apoie o agricultor peruano comprando diretamente no Merkao.' },
    cta:    { es: 'Ver agrícolas', en: 'See produce', pt: 'Ver agrícolas' },
    img:    'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1600&q=80&auto=format&fit=crop',
    categoriaId: 7,
  },
  {
    id: 's5-campo',
    theme: 'terra',
    tag:    { es: 'LO MEJOR DEL CAMPO', en: 'THE BEST OF THE FIELD', pt: 'O MELHOR DO CAMPO' },
    region: 'Alimentos peruanos',
    title:  { es: ['Lo mejor del', 'campo peruano'], en: ['The best of', 'the Peruvian field'], pt: ['O melhor do', 'campo peruano'] },
    sub:    { es: 'Alimentos naturales cultivados en suelo peruano', en: 'Natural foods grown in Peruvian soil', pt: 'Alimentos naturais cultivados em solo peruano' },
    body:   { es: 'Superalimentos, especias y productos naturales de todo el Perú.', en: 'Superfoods, spices and natural products from all over Peru.', pt: 'Superalimentos, especiarias e produtos naturais de todo o Peru.' },
    cta:    { es: 'Ver alimentos', en: 'See food', pt: 'Ver alimentos' },
    img:    'https://images.unsplash.com/photo-1498557850523-fd3d118b962e?w=1600&q=80&auto=format&fit=crop',
    categoriaId: 3,
  },
  {
    id: 's5-proveedores',
    theme: 'gold',
    tag:    { es: 'VENDÉ SIN COMISIONES', en: 'SELL WITHOUT COMMISSIONS', pt: 'VENDA SEM COMISSÕES' },
    region: 'Para productores y agricultores',
    title:  { es: ['Vendé tus', 'productos sin', 'comisiones'], en: ['Sell your', 'products without', 'commissions'], pt: ['Venda seus', 'produtos sem', 'comissões'] },
    sub:    { es: 'Ideal para productores agrícolas y proveedores de alimentos', en: 'Ideal for agricultural producers and food suppliers', pt: 'Ideal para produtores agrícolas e fornecedores de alimentos' },
    body:   { es: 'Publicá tus cosechas y productos en Merkao — gratis el primer año.', en: 'List your harvests and products on Merkao — free for the first year.', pt: 'Publique suas colheitas e produtos no Merkao — grátis no primeiro ano.' },
    cta:    { es: 'Quiero vender', en: 'I want to sell', pt: 'Quero vender' },
    ctaHref: '/register?role=vendedor',
    img:    'https://images.unsplash.com/photo-1471193945509-9ad0617afabf?w=1600&q=80&auto=format&fit=crop',
    categoriaId: 0,
  },
]

// ─── SET 6 ─ Tecnología ───────────────────────────────────────────────
const SET_6: Slide[] = [
  {
    id: 's6-electronicos',
    theme: 'stone',
    tag:    { es: 'ELECTRÓNICOS', en: 'ELECTRONICS', pt: 'ELETRÔNICOS' },
    region: 'Laptops y computadoras',
    title:  { es: ['Electrónicos', 'para el 28'], en: ['Electronics', 'for July 28'], pt: ['Eletrônicos', 'para o 28'] },
    sub:    { es: 'Las mejores laptops y equipos al mejor precio', en: 'The best laptops and equipment at the best price', pt: 'Os melhores laptops e equipamentos ao melhor preço' },
    body:   { es: 'Equipá tu trabajo o el de tu familia este 28 de julio.', en: "Equip your work or your family's this July 28.", pt: 'Equipe seu trabalho ou o da sua família neste 28 de julho.' },
    cta:    { es: 'Ver electrónicos', en: 'See electronics', pt: 'Ver eletrônicos' },
    img:    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1600&q=80&auto=format&fit=crop',
    categoriaId: 2,
  },
  {
    id: 's6-celulares',
    theme: 'stone',
    tag:    { es: 'CELULARES Y GADGETS', en: 'PHONES & GADGETS', pt: 'CELULARES E GADGETS' },
    region: 'Smartphones y accesorios',
    title:  { es: ['Celulares', 'y gadgets'], en: ['Phones', 'and gadgets'], pt: ['Celulares', 'e gadgets'] },
    sub:    { es: 'Smartphones, audífonos y accesorios tech', en: 'Smartphones, headphones and tech accessories', pt: 'Smartphones, fones de ouvido e acessórios tech' },
    body:   { es: 'Encontrá el celular que buscás a precio peruano en Merkao.', en: "Find the phone you're looking for at Peruvian prices on Merkao.", pt: 'Encontre o celular que você procura a preço peruano no Merkao.' },
    cta:    { es: 'Ver electrónicos', en: 'See electronics', pt: 'Ver eletrônicos' },
    img:    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1600&q=80&auto=format&fit=crop',
    categoriaId: 2,
  },
  {
    id: 's6-tech',
    theme: 'stone',
    tag:    { es: 'TECNOLOGÍA PERUANA', en: 'PERUVIAN TECHNOLOGY', pt: 'TECNOLOGIA PERUANA' },
    region: 'Todo en tecnología',
    title:  { es: ['Tecnología', 'peruana'], en: ['Peruvian', 'technology'], pt: ['Tecnologia', 'peruana'] },
    sub:    { es: 'Vendedores peruanos de electrónicos con garantía', en: 'Peruvian electronics sellers with guarantee', pt: 'Vendedores peruanos de eletrônicos com garantia' },
    body:   { es: 'Comprá tecnología con escrow protegido — si no llega, te devolvemos el dinero.', en: "Buy tech with escrow protection — if it doesn't arrive, we refund you.", pt: 'Compre tecnologia com escrow protegido — se não chegar, devolvemos o dinheiro.' },
    cta:    { es: 'Ver electrónicos', en: 'See electronics', pt: 'Ver eletrônicos' },
    img:    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&q=80&auto=format&fit=crop',
    categoriaId: 2,
  },
  {
    id: 's6-registro',
    theme: 'gold',
    tag:    { es: 'REGISTRATE COMO VENDEDOR', en: 'REGISTER AS A SELLER', pt: 'CADASTRE-SE COMO VENDEDOR' },
    region: 'Panel de vendedor gratis',
    title:  { es: ['Registrate', 'como vendedor', 'gratis'], en: ['Register', 'as a seller', 'for free'], pt: ['Cadastre-se', 'como vendedor', 'grátis'] },
    sub:    { es: 'Panel completo · Pedidos · Estadísticas · Sin costo', en: 'Full dashboard · Orders · Stats · No cost', pt: 'Painel completo · Pedidos · Estatísticas · Sem custo' },
    body:   { es: 'Abrí tu tienda en minutos y llegá a compradores de todo el Perú.', en: 'Open your store in minutes and reach buyers from all over Peru.', pt: 'Abra sua loja em minutos e alcance compradores de todo o Peru.' },
    cta:    { es: 'Registrarme', en: 'Sign me up', pt: 'Cadastrar-me' },
    ctaHref: '/register',
    img:    'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=1600&q=80&auto=format&fit=crop',
    categoriaId: 0,
  },
]

// ─── SET 7 ─ Motor y estilo ───────────────────────────────────────────
const SET_7: Slide[] = [
  {
    id: 's7-autos',
    theme: 'terra',
    tag:    { es: 'AUTOS Y MOTOS', en: 'CARS & MOTORCYCLES', pt: 'CARROS E MOTOS' },
    region: 'Motor peruano',
    title:  { es: ['Autos y motos', 'en Merkao'], en: ['Cars and motorcycles', 'on Merkao'], pt: ['Carros e motos', 'no Merkao'] },
    sub:    { es: 'Vehículos, repuestos y accesorios para tu auto', en: 'Vehicles, spare parts and accessories for your car', pt: 'Veículos, peças e acessórios para o seu carro' },
    body:   { es: 'Encontrá lo que necesitás para tu vehículo en vendedores peruanos de confianza.', en: 'Find what you need for your vehicle from trusted Peruvian sellers.', pt: 'Encontre o que você precisa para seu veículo em vendedores peruanos de confiança.' },
    cta:    { es: 'Ver autos y motos', en: 'See cars & motos', pt: 'Ver carros e motos' },
    img:    'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=1600&q=80&auto=format&fit=crop',
    categoriaId: 6,
  },
  {
    id: 's7-vehiculo',
    theme: 'terra',
    tag:    { es: 'TODO PARA TU VEHÍCULO', en: 'EVERYTHING FOR YOUR VEHICLE', pt: 'TUDO PARA SEU VEÍCULO' },
    region: 'Repuestos y accesorios',
    title:  { es: ['Todo para', 'tu vehículo'], en: ['Everything', 'for your vehicle'], pt: ['Tudo para', 'seu veículo'] },
    sub:    { es: 'Repuestos, aceites y accesorios de auto y moto', en: 'Spare parts, oils and car & motorcycle accessories', pt: 'Peças de reposição, óleos e acessórios de carro e moto' },
    body:   { es: 'Mantenimiento, tuning y más — todo en Merkao con garantía de escrow.', en: 'Maintenance, tuning and more — all on Merkao with escrow guarantee.', pt: 'Manutenção, tuning e mais — tudo no Merkao com garantia escrow.' },
    cta:    { es: 'Ver autos y motos', en: 'See cars & motos', pt: 'Ver carros e motos' },
    img:    'https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?w=1600&q=80&auto=format&fit=crop',
    categoriaId: 6,
  },
  {
    id: 's7-moda',
    theme: 'peru',
    tag:    { es: 'MODA PERUANA', en: 'PERUVIAN FASHION', pt: 'MODA PERUANA' },
    region: 'Ropa y estilo',
    title:  { es: ['Moda peruana', 'para cada ocasión'], en: ['Peruvian fashion', 'for every occasion'], pt: ['Moda peruana', 'para cada ocasião'] },
    sub:    { es: 'Prendas únicas de diseñadores y marcas peruanas', en: 'Unique garments from Peruvian designers and brands', pt: 'Roupas únicas de designers e marcas peruanas' },
    body:   { es: 'Descubrí la moda peruana — moderna, colorida y con identidad propia.', en: 'Discover Peruvian fashion — modern, colorful and with its own identity.', pt: 'Descubra a moda peruana — moderna, colorida e com identidade própria.' },
    cta:    { es: 'Ver moda', en: 'See fashion', pt: 'Ver moda' },
    img:    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&q=80&auto=format&fit=crop',
    categoriaId: 1,
  },
  {
    id: 's7-proveedores',
    theme: 'gold',
    tag:    { es: 'MERKAO BUSCA PROVEEDORES', en: 'MERKAO SEEKS SUPPLIERS', pt: 'MERKAO BUSCA FORNECEDORES' },
    region: 'Únete hoy',
    title:  { es: ['Merkao busca', 'proveedores', '· Únete hoy'], en: ['Merkao seeks', 'suppliers', '· Join today'], pt: ['Merkao busca', 'fornecedores', '· Junte-se hoje'] },
    sub:    { es: 'Vendé desde cualquier rincón del Perú, sin comisiones el primer año', en: 'Sell from any corner of Peru, without commissions the first year', pt: 'Venda de qualquer canto do Peru, sem comissões no primeiro ano' },
    body:   { es: 'Registrá tu tienda gratis y empezá a recibir pedidos de todo el país.', en: 'Register your store for free and start receiving orders from all over the country.', pt: 'Registre sua loja gratuitamente e comece a receber pedidos de todo o país.' },
    cta:    { es: 'Quiero vender', en: 'I want to sell', pt: 'Quero vender' },
    ctaHref: '/register?role=vendedor',
    img:    'https://images.unsplash.com/photo-1560472355-536de3962603?w=1600&q=80&auto=format&fit=crop',
    categoriaId: 0,
  },
]

const SETS: Slide[][] = [SET_1, SET_2, SET_3, SET_4, SET_5, SET_6, SET_7]

function getSetActivo(): Slide[] {
  const diasTranscurridos = Math.floor((Date.now() - FECHA_BASE.getTime()) / MS_POR_DIA)
  const crudo = Math.floor(diasTranscurridos / DIAS_POR_SET)
  const indiceSet = ((crudo % SETS.length) + SETS.length) % SETS.length
  return SETS[indiceSet]
}

const SLIDES: Slide[] = getSetActivo()

type EscrowStep = { icon: IconName; labelKey: 'step_pays' | 'step_hold' | 'step_ships' | 'step_confirm' | 'step_release' }
const ESCROW_STEPS: EscrowStep[] = [
  { icon: 'card',        labelKey: 'step_pays' },
  { icon: 'lock',        labelKey: 'step_hold' },
  { icon: 'truck',       labelKey: 'step_ships' },
  { icon: 'checkCircle', labelKey: 'step_confirm' },
  { icon: 'wallet',      labelKey: 'step_release' },
]

/* ─────────────────────────── TIPOS ─────────────────────────── */

type Producto = {
  id: string
  nombre: string
  descripcion: string
  precio: number
  precio_mayoreo?: number
  cantidad_minima_mayoreo?: number
  costo_envio?: number
  stock: number
  categoria_id: number
  imagenes: string[]
  estado: string
  ciudad: string
  vistas: number
}

/* ─────────────────────────── HELPERS ─────────────────────────── */

function ratingFromId(id: string) {
  const n = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return Math.round((4.0 + (n % 11) / 10) * 10) / 10
}
function reviewsFromId(id: string) {
  const n = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return 50 + (n % 950)
}

function Stars({ value, count }: { value: number; count?: number }) {
  const full = Math.round(value)
  return (
    <div className="mk-stars" aria-label={`${value} de 5`}>
      <div className="mk-stars-track">
        {[0, 1, 2, 3, 4].map((i) => (
          <Icon key={i} name="star" size={14} stroke={1.5} className={i < full ? 'mk-star on' : 'mk-star off'} />
        ))}
      </div>
      {count != null && <span className="mk-stars-count">({count})</span>}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="mk-skel">
      <div className="mk-skel-img" />
      <div className="mk-skel-body">
        <div className="mk-skel-line w50" />
        <div className="mk-skel-line w90" />
        <div className="mk-skel-line w70" />
      </div>
    </div>
  )
}

/* ─────────────────────────── PÁGINA ─────────────────────────── */

export default function Home() {
  const [slideIdx, setSlideIdx]               = useState(0)
  const [slideLocked, setSlideLocked]         = useState(false)
  const [busqueda, setBusqueda]               = useState('')
  const [categoriaSearch, setCategoriaSearch] = useState(0)
  const [categoriaFiltro, setCategoriaFiltro] = useState(0)
  const [ciudadFiltro, setCiudadFiltro]       = useState('')
  const totalItems = useCarritoStore((s) => s.totalItems)
  const [agregarAnim, setAgregarAnim]         = useState<string | null>(null)
  const [productos, setProductos]             = useState<Producto[]>([])
  const [loading, setLoading]                 = useState(true)
  const [error, setError]                     = useState('')
  const [pais, setPais]                       = useState('PE')
  const [lang, setLang]                       = useState<Lang>('es')
  const [favoritos, setFavoritos]             = useState<Set<string>>(new Set())
  const [toast, setToast]                     = useState('')
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { user }  = useAuth()
  const tr        = T[lang]
  const catNames  = CAT_NAMES[lang]

  // ── Idioma persistido ──
  useEffect(() => {
    const saved = localStorage.getItem('merkao_lang') as Lang | null
    if (saved && ['es', 'en', 'pt'].includes(saved)) setLang(saved)
  }, [])

  const cambiarIdioma = (l: Lang) => {
    setLang(l)
    localStorage.setItem('merkao_lang', l)
  }

  // ── País por IP ──
  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then((r) => r.json())
      .then((d) => { if (d?.country_code) setPais(d.country_code) })
      .catch(() => {})
  }, [])

  // ── Carousel ──
  const siguiente = useCallback(() => setSlideIdx((p) => (p + 1) % SLIDES.length), [])
  const anterior  = useCallback(() => setSlideIdx((p) => (p - 1 + SLIDES.length) % SLIDES.length), [])
  useEffect(() => {
    if (slideLocked) return
    const t = setInterval(siguiente, 6500)
    return () => clearInterval(t)
  }, [siguiente, slideLocked])

  // ── Auto-lock hero en slide cuya categoría sea la dominante ──
  useEffect(() => {
    let cancel = false
    async function detectar() {
      const { data, error } = await supabase
        .from('productos')
        .select('categoria_id')
        .eq('estado', 'activo')
        .gt('stock', 0)
      if (cancel || error || !data || data.length === 0) return
      const counts = new Map<number, number>()
      for (const row of data) counts.set(row.categoria_id, (counts.get(row.categoria_id) || 0) + 1)
      let topCat = 0, topCount = 0
      for (const [cat, n] of counts) if (n > topCount) { topCount = n; topCat = cat }
      const idx = SLIDES.findIndex((s) => s.categoriaId === topCat)
      if (idx >= 0) {
        setSlideIdx(idx)
        setSlideLocked(true)
      }
    }
    detectar()
    return () => { cancel = true }
  }, [])

  // ── Cargar productos ──
  useEffect(() => {
    async function cargar() {
      setLoading(true)
      setError('')
      let q = supabase
        .from('productos')
        .select('id, nombre, descripcion, precio, precio_mayoreo, cantidad_minima_mayoreo, costo_envio, stock, categoria_id, imagenes, estado, ciudad, vistas')
        .eq('estado', 'activo')
        .order('vistas', { ascending: false })
      if (categoriaFiltro !== 0) q = q.eq('categoria_id', categoriaFiltro)
      if (ciudadFiltro)          q = q.eq('ciudad', ciudadFiltro)
      const { data, error: e } = await q
      if (e) setError(lang === 'en' ? 'Could not load products.' : lang === 'pt' ? 'Não foi possível carregar os produtos.' : 'No se pudieron cargar los productos.')
      else setProductos(data || [])
      setLoading(false)
    }
    cargar()
  }, [categoriaFiltro, ciudadFiltro, lang])

  const showToast = (msg: string) => {
    setToast(msg)
    if (toastRef.current) clearTimeout(toastRef.current)
    toastRef.current = setTimeout(() => setToast(''), 1900)
  }

  const agregarAlCarrito = (id: string) => {
    setAgregarAnim(id)
    setTimeout(() => setAgregarAnim(null), 700)
    showToast(lang === 'en' ? 'Added to cart' : lang === 'pt' ? 'Adicionado ao carrinho' : 'Producto agregado al carrito')
  }

  const toggleFav = (id: string) => {
    setFavoritos((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  const goToShop = (catId: number) => {
    setCategoriaFiltro(catId)
    setSlideLocked(true)
    setTimeout(() => {
      const el = document.getElementById('mk-shop')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  const productosFiltrados = busqueda.trim()
    ? productos.filter((p) => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    : productos

  const arancelInfo = ARANCELES[pais]
  const userLabel   = user?.email ? user.email.split('@')[0] : null
  const cartCount   = totalItems()

  return (
    <>
      <TrackPageView />
      {/* ══════════════════ HEADER ══════════════════ */}
      <header className="mk-hdr">
        <div className="mk-hdr-top">
          <div className="mk-hdr-inner">
            <a className="mk-logo" href="/">merkao<span className="mk-logo-dot">.pe</span></a>
            {new Date().getMonth() === 6 && (
              <span className="mk-fiestas" aria-label="Felices Fiestas Patrias Peru">
                <span className="mk-fiestas-red">¡Felices Fiestas</span>
                <span className="mk-fiestas-white">Patrias!</span>
              </span>
            )}

            <div className="mk-ship-from">
              <span className="mk-ship-label">{tr.delivering_from}</span>
              <span className="mk-ship-where">
                {arancelInfo ? `${arancelInfo.bandera} ${arancelInfo.pais}` : '🇵🇪 Perú'}
              </span>
            </div>

            <div className="mk-searchbar">
              <select
                className="mk-search-cat"
                value={categoriaSearch}
                onChange={(e) => setCategoriaSearch(Number(e.target.value))}
                aria-label="Categoría"
              >
                <option value={0}>{catNames[0]}</option>
                {CATEGORIAS.map((c) => (
                  <option key={c.id} value={c.id}>{catNames[c.id]}</option>
                ))}
              </select>
              <input
                className="mk-search-input"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder={tr.search_placeholder}
              />
              <button className="mk-search-btn" aria-label="Buscar">
                <Icon name="search" size={20} />
              </button>
            </div>

            <div className="mk-lang">
              {(['es', 'en', 'pt'] as Lang[]).map((l) => (
                <button
                  key={l}
                  className={'mk-lang-btn' + (lang === l ? ' on' : '')}
                  onClick={() => cambiarIdioma(l)}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>

            {userLabel ? (
              <a className="mk-hdr-link mk-account" href="/perfil">
                <Icon name="user" size={22} stroke={1.8} />
                <span className="mk-hdr-link-txt">
                  <small>{tr.hello_user} {userLabel}</small>
                  <strong>{tr.account.replace('▾', '').trim()} <Icon name="chevronDown" size={12} /></strong>
                </span>
              </a>
            ) : (
              <a className="mk-hdr-link mk-account" href="/login">
                <Icon name="user" size={22} stroke={1.8} />
                <span className="mk-hdr-link-txt">
                  <small>{tr.hello_sign_in}</small>
                  <strong>{tr.account.replace('▾', '').trim()} <Icon name="chevronDown" size={12} /></strong>
                </span>
              </a>
            )}

            <a className="mk-hdr-link" href="/pedidos">
              <span className="mk-hdr-link-txt right">
                <small>{tr.my_orders_label}</small>
                <strong>{tr.my_orders}</strong>
              </span>
            </a>

            <a className="mk-cart-btn" href="/carrito">
              <span className="mk-cart-ico">
                <Icon name="cart" size={24} stroke={1.8} />
                {cartCount > 0 && <span className="mk-cart-badge">{cartCount > 99 ? '99+' : cartCount}</span>}
              </span>
              <strong>{tr.cart}</strong>
            </a>
          </div>
        </div>

        {arancelInfo && (
          <div className="mk-arancel">
            {arancelInfo.bandera} {tr.delivering_from} <strong>{arancelInfo.pais}</strong> —{' '}
            {lang === 'en' ? 'import duty' : lang === 'pt' ? 'tarifa de importação' : 'arancel de importación'}: <strong>{Math.round(arancelInfo.tasa * 100)}%</strong>
            <button onClick={() => setPais('PE')}>{tr.change_to_peru}</button>
          </div>
        )}

        <nav className="mk-hdr-nav">
          <div className="mk-hdr-inner">
            <a className="mk-nav-all" href="/categorias">
              <Icon name="menu" size={18} />
              {lang === 'en' ? 'All categories' : lang === 'pt' ? 'Todas as categorias' : 'Todas las categorías'}
            </a>
            <div className="mk-nav-cats">
              <button onClick={() => goToShop(0)} className="mk-nav-cat accent">
                <Icon name="flame" size={16} stroke={1.8} />
                {lang === 'en' ? 'Daily deals' : lang === 'pt' ? 'Ofertas do dia' : 'Ofertas del día'}
              </button>
              {CATEGORIAS.map((c) => (
                <a key={c.id} href={`/categorias/${CAT_SLUG[c.id]}`} className="mk-nav-cat">
                  <Icon name={c.icon} size={16} stroke={1.8} /> {catNames[c.id]}
                </a>
              ))}
            </div>
            <a className="mk-nav-sell" href="/register?role=vendedor">
              <Icon name="store" size={17} stroke={1.8} />
              {lang === 'en' ? 'Sell on Merkao' : lang === 'pt' ? 'Vender no Merkao' : 'Vende en Merkao'}
            </a>
          </div>
        </nav>
      </header>

      {/* ══════════════════ MAIN ══════════════════ */}
      <main className="mk-main">

        {/* HERO carousel */}
        <section
          className="mk-hero"
          onMouseEnter={() => setSlideLocked(true)}
          onMouseLeave={() => setSlideLocked(false)}
        >
          {SLIDES.map((sl, k) => (
            <div key={sl.id} className={`mk-hslide mk-theme-${sl.theme}${k === slideIdx ? ' on' : ''}`}>
              <div className="mk-hslide-copy">
                <span className="mk-hero-tag"><Icon name="zap" size={13} /> {sl.tag[lang]}</span>
                <h1 className="mk-hero-title">
                  {sl.title[lang].map((line, j) => <span key={j}>{line}</span>)}
                </h1>
                <p className="mk-hero-sub">{sl.sub[lang]}</p>
                <p className="mk-hero-body">{sl.body[lang]}</p>
                {sl.ctaHref ? (
                  <a className="mk-hero-cta" href={sl.ctaHref}>
                    {sl.cta[lang]} <Icon name="arrowRight" size={18} />
                  </a>
                ) : (
                  <button className="mk-hero-cta" onClick={() => goToShop(sl.categoriaId)}>
                    {sl.cta[lang]} <Icon name="arrowRight" size={18} />
                  </button>
                )}
              </div>
              <div className="mk-hslide-media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sl.img} alt={sl.region} loading={k === 0 ? 'eager' : 'lazy'} />
                <span className="mk-hslide-region">
                  <Icon name="mapPin" size={13} stroke={2} /> {sl.region}
                </span>
              </div>
            </div>
          ))}
          <button className="mk-hero-arrow left" onClick={anterior} aria-label="Anterior"><Icon name="chevronLeft" size={26} /></button>
          <button className="mk-hero-arrow right" onClick={siguiente} aria-label="Siguiente"><Icon name="chevronRight" size={26} /></button>
          <div className="mk-hero-dots">
            {SLIDES.map((s, k) => (
              <button
                key={s.id}
                className={'mk-dot' + (k === slideIdx ? ' on' : '')}
                onClick={() => setSlideIdx(k)}
                aria-label={`Slide ${k + 1}`}
              />
            ))}
          </div>
        </section>

        {/* ESCROW strip */}
        <a className="mk-escrow" href="#escrow-info">
          <div className="mk-escrow-lead">
            <span className="mk-escrow-ico"><Icon name="shield" size={26} stroke={1.7} /></span>
            <div>
              <h3>{tr.escrow_title}</h3>
              <p>{tr.escrow_desc}</p>
            </div>
          </div>
          <div className="mk-escrow-steps">
            {ESCROW_STEPS.map((s, k) => (
              <span key={s.labelKey} style={{ display: 'contents' }}>
                <div className="mk-escrow-step">
                  <span className="mk-escrow-step-ico"><Icon name={s.icon} size={20} stroke={1.8} /></span>
                  <span className="mk-escrow-step-label">{tr[s.labelKey]}</span>
                </div>
                {k < ESCROW_STEPS.length - 1 && (
                  <span className="mk-escrow-sep"><Icon name="chevronRight" size={14} /></span>
                )}
              </span>
            ))}
          </div>
        </a>

        {/* CATEGORÍAS */}
        <section className="mk-block">
          <div className="mk-block-head">
            <h2>{tr.buy_by_category}</h2>
          </div>
          <div className="mk-cat-grid">
            {CATEGORIAS.map((c) => (
              <a key={c.id} href={`/categorias/${CAT_SLUG[c.id]}`} className="mk-cat-tile">
                <span className="mk-cat-tile-ico"><Icon name={c.icon} size={26} stroke={1.6} /></span>
                <span className="mk-cat-tile-label">{catNames[c.id]}</span>
              </a>
            ))}
          </div>
        </section>

        {/* FILTROS DE CIUDAD */}
        <div className="mk-city-row" role="tablist" aria-label={tr.filter_by_city}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', flexShrink: 0 }}>
            <Icon name="mapPin" size={14} stroke={2} /> {tr.filter_by_city}:
          </span>
          <button
            onClick={() => setCiudadFiltro('')}
            className={'mk-city-chip' + (!ciudadFiltro ? ' on' : '')}
          >
            {tr.all_cities}
          </button>
          {DEPARTAMENTOS_PERU.map((dep) => (
            <button
              key={dep}
              onClick={() => setCiudadFiltro(dep === ciudadFiltro ? '' : dep)}
              className={'mk-city-chip' + (ciudadFiltro === dep ? ' on' : '')}
            >
              {dep}
            </button>
          ))}
        </div>

        {/* SHOP: products grid + AdRail */}
        <section id="mk-shop" className="mk-shop">
          <div className="mk-shop-main">
            <div className="mk-block-head">
              <h2>
                {categoriaFiltro === 0
                  ? tr.all_products
                  : catNames[categoriaFiltro]}
                {ciudadFiltro && (
                  <span style={{ marginLeft: 12, fontSize: 14, fontWeight: 600, color: 'var(--brand-700)' }}>
                    · {ciudadFiltro}
                  </span>
                )}
              </h2>
              {(categoriaFiltro !== 0 || ciudadFiltro || busqueda) && (
                <button
                  className="mk-block-link"
                  onClick={() => { setCategoriaFiltro(0); setCiudadFiltro(''); setBusqueda('') }}
                >
                  {tr.see_all}
                </button>
              )}
            </div>

            {busqueda && (
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
                {productosFiltrados.length} {tr.results_for} &ldquo;<strong>{busqueda}</strong>&rdquo;
              </p>
            )}

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: 14, color: '#B91C1C', fontSize: 14 }}>
                ⚠️ {error}
              </div>
            )}

            <div className="mk-prod-grid">
              {loading && Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}

              {!loading && productosFiltrados.map((prod) => {
                const rating  = ratingFromId(prod.id)
                const reviews = reviewsFromId(prod.id)
                const imagen  = prod.imagenes?.[0] ?? `https://picsum.photos/seed/${prod.id}/600/600`
                const enCarrito = agregarAnim === prod.id
                const p = calcularPrecios(prod.precio, pais)
                const tieneMayoreo = prod.precio_mayoreo && prod.cantidad_minima_mayoreo
                const fav = favoritos.has(prod.id)

                return (
                  <article key={prod.id} className="mk-card">
                    <a href={`/productos/${prod.id}`} className="mk-card-media">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imagen} alt={prod.nombre} loading="lazy" />
                      {prod.stock > 0 && prod.stock <= 5 && (
                        <span className="mk-card-stock">
                          {lang === 'en' ? `Only ${prod.stock} left` : lang === 'pt' ? `Restam ${prod.stock}` : `¡Últimas ${prod.stock}!`}
                        </span>
                      )}
                      {prod.ciudad && (
                        <span className="mk-card-loc">
                          <Icon name="mapPin" size={12} stroke={2} /> {prod.ciudad}
                        </span>
                      )}
                      <button
                        className={'mk-card-fav' + (fav ? ' on' : '')}
                        onClick={(e) => { e.preventDefault(); toggleFav(prod.id) }}
                        aria-label="Guardar"
                        aria-pressed={fav}
                      >
                        <Icon name="heart" size={17} stroke={2} />
                      </button>
                    </a>

                    <div className="mk-card-body">
                      <span className="mk-card-cat">{catNames[prod.categoria_id] ?? ''}</span>
                      <a href={`/productos/${prod.id}`} className="mk-card-title-link">
                        <h3 className="mk-card-title">{prod.nombre}</h3>
                      </a>
                      <Stars value={rating} count={reviews} />
                      <div className="mk-card-price">{fmt(p.total)}</div>
                      <div className="mk-card-breakdown">
                        <div className="mk-bd-row"><span>{lang === 'en' ? 'Base price' : lang === 'pt' ? 'Preço base' : 'Base'}</span><span>{fmt(p.base)}</span></div>
                        <div className="mk-bd-row"><span>+ IGV 18%</span><span>{fmt(p.igv)}</span></div>
                        {p.arancel > 0 && p.paisInfo && (
                          <div className="mk-bd-row amber">
                            <span>+ {p.paisInfo.bandera} {Math.round(p.tasaArancel * 100)}%</span>
                            <span>{fmt(p.arancel)}</span>
                          </div>
                        )}
                        <div className="mk-bd-row">
                          <span>+ {lang === 'en' ? 'Merkao service 3%' : lang === 'pt' ? 'Taxa Merkao 3%' : 'Tarifa Merkao 3%'}</span>
                          <span>{fmt(p.tarifaServicio)}</span>
                        </div>
                      </div>
                      <div className="mk-card-ship">
                        <Icon name="truck" size={14} stroke={1.8} />
                        {prod.costo_envio === 0 || prod.costo_envio == null
                          ? tr.agree_shipping
                          : `${tr.shipping_prefix}${fmt(prod.costo_envio)}`}
                      </div>
                      {tieneMayoreo && (
                        <div style={{ fontSize: 11.5, color: 'var(--green)', background: 'var(--green-tint)', borderRadius: 8, padding: '6px 10px', fontWeight: 700 }}>
                          {tr.wholesale_from} {prod.cantidad_minima_mayoreo} {tr.units}: {fmt(prod.precio_mayoreo!)}
                        </div>
                      )}
                      <div className="mk-card-actions">
                        <a href={`/checkout?id=${prod.id}`} className="mk-btn mk-btn-primary">
                          {tr.buy_now}
                        </a>
                        <button
                          onClick={() => agregarAlCarrito(prod.id)}
                          className="mk-btn mk-btn-ghost"
                          style={enCarrito ? { background: 'var(--green-tint)', borderColor: 'var(--green)', color: 'var(--green)' } : undefined}
                        >
                          <Icon name="plus" size={16} /> {enCarrito ? tr.added : tr.add_to_cart}
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}

              {!loading && !error && productosFiltrados.length === 0 && (
                <div style={{ gridColumn: '1/-1', padding: '64px 16px', textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14 }}>
                  <Icon name="search" size={40} stroke={1.5} style={{ color: 'var(--muted-2)', margin: '0 auto 12px' }} />
                  <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{tr.no_products}</p>
                  <button
                    onClick={() => { setBusqueda(''); setCategoriaFiltro(0); setCiudadFiltro('') }}
                    className="mk-btn mk-btn-ghost"
                    style={{ marginTop: 16 }}
                  >
                    {tr.see_all}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* AdRail: PresupIA Web + DevNova + Vende en Merkao */}
          <aside className="mk-ad-rail">
            <a href="https://presupia-web.vercel.app" target="_blank" rel="noopener noreferrer" className="mk-ad mk-ad-presupia">
              <span className="mk-ad-label">Ad</span>
              <span className="mk-ad-pill"><Icon name="zap" size={12} stroke={2} /> PresupIA</span>
              <h3 className="mk-ad-head">
                {lang === 'en' ? 'Build in Peru? Generate your budget with AI' : lang === 'pt' ? 'Constrói no Peru? Gere seu orçamento com IA' : '¿Construyes en Perú? Genera tu presupuesto con IA'}
              </h3>
              <p className="mk-ad-sub">
                {lang === 'en' ? 'Upload your plan and get a budget in seconds.' : lang === 'pt' ? 'Envie seu projeto e obtenha um orçamento em segundos.' : 'Sube tu plano y obtén presupuesto en segundos.'}
              </p>
              <span className="mk-ad-cta mk-ad-cta-blue">
                {lang === 'en' ? 'Try free' : lang === 'pt' ? 'Testar grátis' : 'Probar gratis'} <Icon name="arrowRight" size={14} />
              </span>
            </a>

            <a href="https://devnovaai.com" target="_blank" rel="noopener noreferrer" className="mk-ad mk-ad-devnova">
              <span className="mk-ad-label">Ad</span>
              <span className="mk-ad-pill"><Icon name="zap" size={12} stroke={2} /> DevNova AI</span>
              <h3 className="mk-ad-head">
                {lang === 'en' ? 'Got an app or web idea? We build it' : lang === 'pt' ? 'Tem uma ideia de app ou web? A gente faz' : '¿Tienes una idea de app o web? Te la construimos'}
              </h3>
              <p className="mk-ad-sub">
                {lang === 'en' ? 'Mobile apps, websites and software with AI · devnovaai.com' : lang === 'pt' ? 'Apps, sites e software com IA · devnovaai.com' : 'Apps móviles, webs y software con IA · devnovaai.com'}
              </p>
              <span className="mk-ad-cta mk-ad-cta-mint">
                {lang === 'en' ? 'Get a quote' : lang === 'pt' ? 'Solicitar orçamento' : 'Cotizar proyecto'} <Icon name="arrowRight" size={14} />
              </span>
            </a>

            <a href="/register?role=vendedor" className="mk-ad mk-ad-sell">
              <span className="mk-ad-pill"><Icon name="store" size={12} stroke={2} /> {tr.want_to_sell.replace('¿', '').replace('?', '').replace('¡', '')}</span>
              <h3 className="mk-ad-head">{tr.start_store}</h3>
              <p className="mk-ad-sub">
                {lang === 'en'
                  ? 'Seller keeps 100% of the price. Merkao charges 3% to the buyer.'
                  : lang === 'pt'
                  ? 'O vendedor recebe 100%. Merkao cobra 3% ao comprador.'
                  : 'El vendedor recibe el 100% de su precio. Merkao cobra 3% al comprador.'}
              </p>
              <span className="mk-ad-cta mk-ad-cta-orange">
                {tr.create_store} <Icon name="arrowRight" size={14} />
              </span>
            </a>
          </aside>
        </section>
      </main>

      {/* ══════════════════ FOOTER ══════════════════ */}
      <footer className="mk-footer">
        <div className="mk-footer-inner">
          <div className="mk-footer-brand">
            <a className="mk-logo mk-logo-foot" href="/">merkao<span className="mk-logo-dot">.pe</span></a>
            <p>
              {lang === 'en'
                ? 'The Peruvian marketplace. Buy and sell across Peru with protected payment.'
                : lang === 'pt'
                ? 'O marketplace peruano. Compre e venda em todo o Peru com pagamento protegido.'
                : 'El marketplace peruano. Compra y vende en todo el Perú con pago protegido.'}
            </p>
            <span className="mk-footer-trust"><Icon name="shield" size={16} /> {tr.escrow_title}</span>
          </div>

          {([
            {
              h: lang === 'en' ? 'Buy' : lang === 'pt' ? 'Comprar' : 'Comprar',
              items: [
                { label: lang === 'en' ? 'Daily deals' : lang === 'pt' ? 'Ofertas do dia' : 'Ofertas del día', href: '#' },
                { label: tr.buy_by_category, href: '#' },
                { label: lang === 'en' ? 'How to buy' : lang === 'pt' ? 'Como comprar' : 'Cómo comprar', href: '#' },
                { label: tr.escrow_title, href: '#' },
              ],
            },
            {
              h: lang === 'en' ? 'Sell' : lang === 'pt' ? 'Vender' : 'Vender',
              items: [
                { label: lang === 'en' ? 'Sell on Merkao' : lang === 'pt' ? 'Vender no Merkao' : 'Vende en Merkao', href: '/vendedor' },
                { label: lang === 'en' ? 'Publish product' : lang === 'pt' ? 'Publicar produto' : 'Publicar producto', href: '/vendedor/publicar' },
                { label: lang === 'en' ? 'Fees & commissions' : lang === 'pt' ? 'Tarifas e comissões' : 'Tarifas y comisiones', href: '#' },
                { label: lang === 'en' ? 'Seller center' : lang === 'pt' ? 'Centro de vendedores' : 'Centro de vendedores', href: '/vendedor' },
              ],
            },
            {
              h: lang === 'en' ? 'Help' : lang === 'pt' ? 'Ajuda' : 'Ayuda',
              items: [
                { label: lang === 'en' ? 'Help center' : lang === 'pt' ? 'Central de ajuda' : 'Centro de ayuda', href: '#' },
                { label: lang === 'en' ? 'Shipping & delivery' : lang === 'pt' ? 'Envios e entregas' : 'Envíos y entregas', href: '#' },
                { label: lang === 'en' ? 'Returns' : lang === 'pt' ? 'Devoluções' : 'Devoluciones', href: '#' },
                { label: lang === 'en' ? 'Contact' : lang === 'pt' ? 'Contato' : 'Contacto', href: '/contacto' },
                { label: lang === 'en' ? 'Complaints Book' : lang === 'pt' ? 'Livro de Reclamações' : 'Libro de Reclamaciones', href: '/libro-de-reclamaciones' },
              ],
            },
            {
              h: 'Merkao',
              items: [
                { label: lang === 'en' ? 'About us' : lang === 'pt' ? 'Sobre nós' : 'Sobre nosotros', href: '#' },
                { label: lang === 'en' ? 'Made in Peru' : lang === 'pt' ? 'Feito no Peru' : 'Hecho en Perú', href: '#' },
                { label: lang === 'en' ? 'Careers' : lang === 'pt' ? 'Trabalhe conosco' : 'Trabaja con nosotros', href: '#' },
                { label: lang === 'en' ? 'Terms & privacy' : lang === 'pt' ? 'Termos e privacidade' : 'Términos y privacidad', href: '#' },
              ],
            },
          ] as const).map((col) => (
            <div key={col.h} className="mk-footer-col">
              <h4>{col.h}</h4>
              <ul>
                {col.items.map((it) => (
                  <li key={it.label}><a href={it.href}>{it.label}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mk-footer-bar">
          <span>© 2026 Merkao · {lang === 'en' ? 'Made in Peru' : lang === 'pt' ? 'Feito no Peru' : 'Hecho en Perú'}</span>
          <span>
            {lang === 'en' ? 'We accept' : lang === 'pt' ? 'Aceitamos' : 'Aceptamos'}: Yape · Plin · Visa · Mastercard · {lang === 'en' ? 'Transfer' : lang === 'pt' ? 'Transferência' : 'Transferencia'}
          </span>
        </div>
      </footer>

      {/* TOAST */}
      {toast && (
        <div className="mk-toast">
          <Icon name="checkCircle" size={18} /> {toast}
        </div>
      )}

      {/* signOut helper invisible para no romper hooks anteriores */}
      <button onClick={handleSignOut} style={{ display: 'none' }} aria-hidden tabIndex={-1} />
    </>
  )
}
