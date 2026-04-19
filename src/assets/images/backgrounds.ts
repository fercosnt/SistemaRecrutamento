/**
 * Backgrounds do Beauty Smile
 * Importações centralizadas para facilitar o uso em todo o sistema
 */

// Background azul escuro com gradiente sutil
// Ideal para: Hero sections, Login, Areas administrativas
import bgDarkBlue from '../5feab6fe2a4e5e85a5b01894d30667ea3a06a9d0.webp';

// Background dourado com textura elegante
// Ideal para: Seções premium, Destaques, CTAs especiais
import bgGold from '../91b67d31b9aa67c340ac4a375a9832d8c0284448.png';

// Background gradiente turquesa/azul moderno
// Ideal para: Questionários, Testes psicométricos, Áreas tecnológicas
import bgGradient from '../72212e27083bc5aff34e367036bc5f1a36b908b7.jpeg';

export const backgrounds = {
  // Background principal - azul escuro (#00109E)
  darkBlue: bgDarkBlue,
  
  // Background secundário - dourado (#BB965B)
  gold: bgGold,
  
  // Background accent - gradiente turquesa/azul (#35BFAD)
  gradient: bgGradient,
  
  // Adicione mais backgrounds aqui conforme necessário
  // pattern: bgPattern,
  // texture: bgTexture,
} as const;

export type BackgroundKey = keyof typeof backgrounds;
