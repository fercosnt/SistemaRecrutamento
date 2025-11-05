import image_8daad5a957d595d21d69bb8a7bc7e3ab794be41a from 'figma:asset/8daad5a957d595d21d69bb8a7bc7e3ab794be41a.png';
import image_4ae5e44e01d12f3447c7a4e50527f0bc3c3aab25 from 'figma:asset/4ae5e44e01d12f3447c7a4e50527f0bc3c3aab25.png';
import image_ce81f0d7520a337fc357fae4f5f7bf76164b8c05 from 'figma:asset/ce81f0d7520a337fc357fae4f5f7bf76164b8c05.png';
import React from 'react';
import { BackgroundImage } from '../BackgroundImage';
import { BeautySmileLogo } from '../BeautySmileLogo';
import { Glass, GlassCard, GlassPanel, GlassButton } from '../ui/glass';
import { MapPin, Clock, Briefcase, GraduationCap, Award, Heart, ArrowRight, CheckCircle2, Rocket, FileText, Brain, Video, Building2, PartyPopper, Calendar, Target } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import heroImage from 'figma:asset/a81ed2cde200cdf4e82689faaeafaceff5cd291a.png';
import clinicaImage from 'figma:asset/3fc028ae080bb7435c5ebf8f1e62a8036e20c73c.png';

/**
 * Landing Page de Divulgação de Vaga
 * Template reutilizável para diferentes vagas
 */

interface TeamMember {
  name: string;
  role: string;
  image: string;
  instagram?: string;
  linkedin?: string;
  youtube?: string;
}

interface VagaLPProps {
  // Hero
  cargo: string;
  mensagemBoasVindas?: string;
  subtituloHero: string;
  imagemHero?: string;
  
  // Info rápida
  local: string;
  regime: string;
  inicio: string;
  salario?: string;
  
  // Sobre Beauty Smile
  sobreBeautySmile: string;
  imagemSobreBeautySmile?: string;
  
  // Team (fundadores)
  mostrarTeam?: boolean;
  teamMembers?: TeamMember[];
  
  // O que você vai fazer
  oQueVaiFazer: {
    introducao: string;
    descricaoMaestro: string;
    diaDiaLabel: string;
    diaDia: string[];
    importaLabel: string;
    importa: string;
    coordenacao: string;
    impactoLabel: string;
    impacto: string[];
    conclusao: string;
  };
  
  // Responsabilidades
  responsabilidades: string[];
  
  // Requisitos
  formacao: string[];
  experiencia: string[];
  conhecimentosTecnicos: string[];
  habilidadesEssenciais: string[];
  
  // Perfil ideal
  vocePessoaCerta?: Array<{
    titulo: string;
    descricao: string;
  }>;
  
  // Diferenciais
  seriaIncrivel: string[];
  
  // Benefícios
  oferecemos: string[];
  
  // Local detalhado
  localDetalhado?: string;
  horarioDetalhado?: string;
  observacoesLocal?: string[];
  
  // CTA
  convite: string;
  
  // Ação
  onCandidatar?: () => void;
}

export function VagaLPPage({
  cargo = "Gestor de Marketing Digital",
  mensagemBoasVindas = "Bem-vindo(a) ao processo seletivo para vaga de",
  subtituloHero = "Beauty Smile, onde inovação e excelência se encontram para revolucionar a odontologia!",
  imagemHero,
  
  local = "São Paulo, SP",
  regime = "PJ | Segunda a sexta, horário comercial",
  inicio = "Imediato",
  salario,
  
  sobreBeautySmile = `Beauty Smile não é uma clínica odontológica comum. Somos pioneiros em eliminar o trauma que gerações carregam sobre ir ao dentista.

Com a tecnologia laser Fotona LightWalker — a mais avançada do mundo e exclusiva no Brasil para odontologia — provamos todos os dias que odontologia pode ser indolor, acolhedora e verdadeiramente transformadora. Mas nossa inovação vai além do equipamento: somos dentistas de gente, não de dente.

Três visionários fecharam clínicas de 30+ anos de sucesso para apostar em uma cruzada: transformar a odontologia global. Provar que existe um jeito radicalmente melhor. Educar o mercado paciente por paciente, campanha por campanha, história transformadora por história transformadora.

Já realizamos mais de 5.000 tratamentos com tecnologia exclusiva. Atendemos gratuitamente mais de 1.400 pessoas em comunidades como Morro do Alemão e Vila Olímpica do Salgueiro. Temos parcerias de pesquisa com USP, UNESP, UNINOVE e São Leopoldo Mandic. Fomos premiados no maior congresso de pesquisa odontológica do Brasil.

Mas os números mais importantes não cabem em planilhas:

- Marcos Paulo tinha fobia paralisante de dentista. Quase quebrou um consultório de tanto pavor. Hoje? Dorme na cadeira durante os procedimentos.

- Luzia passou por 30 dentistas. Todos queriam extrair seus dentes. Na Beauty Smile? Salvamos todos.

- Márcio tinha apneia severa (nível 27). Após tratamento com laser? Curado. De 27 para zero.

E você vai ser responsável por fazer essas histórias chegarem a milhares de pessoas que ainda não sabem que existe odontologia sem trauma.`,
  imagemSobreBeautySmile,
  
  mostrarTeam = true,
  teamMembers = [
    {
      name: "Fernando Costa Jr",
      role: "Fundador e Cirurgião Dentista",
      image: image_ce81f0d7520a337fc357fae4f5f7bf76164b8c05,
      instagram: "@fernandocostajr",
      linkedin: "Fernando Costa Jr"
    },
    {
      name: "Fernando Costa Neto",
      role: "CEO e Cirurgião Dentista",
      image: image_4ae5e44e01d12f3447c7a4e50527f0bc3c3aab25,
      instagram: "@fernandocostaneto",
      linkedin: "Fernando Costa Neto"
    },
    {
      name: "Beauty Smile",
      role: "Transformando Sorrisos",
      image: image_8daad5a957d595d21d69bb8a7bc7e3ab794be41a,
      instagram: "@beautysmile",
      linkedin: "Beauty Smile",
      youtube: "Beauty Smile Fotona"
    }
  ],
  
  oQueVaiFazer = {
    introducao: "Como Gestor de Marketing Digital na Beauty Smile, você não vai apenas 'gerenciar campanhas'. Você vai orquestrar a comunicação de uma revolução.",
    descricaoMaestro: "Você será o maestro que coordena múltiplas frentes criativas simultaneamente — design estático, vídeo, copywriting, social media, landing pages, tráfego, email marketing — garantindo que cada peça reflita a excelência clínica que entregamos e os valores inegociáveis que vivemos.",
    diaDiaLabel: "Seu dia a dia envolve:",
    diaDia: [
      "Coordenar equipes técnicas (internas e externas) para garantir que cada criativo saia no prazo, no padrão e alinhado à estratégia",
      "Transformar briefings em campanhas de performance que educam o mercado sobre a Beauty Smile enquanto atraem os pacientes certos",
      "Analisar métricas constantemente para gerar insights que otimizam resultados",
      "Criar calendários estratégicos que antecipam demandas e mantêm a consistência da marca em múltiplas plataformas"
    ],
    importaLabel: "Mas aqui está o que realmente importa:",
    importa: "Você não vai apenas aumentar conversões ou gerar leads. Você vai ser a ponte entre casos de transformação reais e pessoas que ainda vivem com medo de dentista. Cada campanha bem executada, cada vídeo emocionante, cada copy persuasivo é uma semente plantada de que odontologia pode ser diferente.",
    coordenacao: "Você vai coordenar a criação de conteúdos que respeitam as regras do Conselho Federal de Odontologia mas que, ao mesmo tempo, educam, emocionam e convertem. Você vai garantir que a história de Marcos Paulo (que venceu a fobia) chegue até a próxima pessoa que precisa vencê-la também.",
    impactoLabel: "Seu impacto é direto e mensurável:",
    impacto: [
      "Cada lead qualificado que você gera = alguém descobrindo que existe tratamento sem dor",
      "Cada campanha otimizada = mais pessoas acessando tecnologia que muda vidas",
      "Cada post engajado = educação de mercado sobre odontologia moderna",
      "Cada métrica melhorada = mais recursos para expandir (inclusive projetos sociais)"
    ],
    conclusao: "Você não está vendendo serviços odontológicos. Você está amplificando uma missão."
  },
  
  responsabilidades = [
    "Coordenar toda a produção criativa — garantir que criativos estáticos, vídeos, videomotions e materiais derivados sejam entregues dentro do prazo",
    "Supervisionar processos de marketing digital de ponta a ponta — desde o briefing inicial até a análise pós-campanha",
    "Gerenciar equipes técnicas multidisciplinares — coordenar copywriters, designers, video makers, social media, webdesigners, gestor de tráfego e infraestrutura, atuando como elo entre criação e execução",
    "Desenvolver e executar estratégias de campanhas pagas — planejar campanhas no Meta e Google Ads que gerem ROI/ROAS ≥3, sempre baseadas em dados, testes e aprendizados contínuos",
    "Criar e gerenciar calendários editoriais estratégicos — planejar mensalmente conteúdos para múltiplas plataformas",
    "Analisar performance e gerar insights acionáveis — transformar métricas em decisões"
  ],
  
  formacao = [
    "Graduação completa em Marketing, Publicidade, Comunicação ou áreas correlatas",
    "Pós-graduação, MBA ou especializações em Marketing Digital serão um diferencial forte"
  ],
  
  experiencia = [
    "Pelo menos 3 anos em gestão de marketing digital com foco em performance e resultados",
    "Experiência comprovada coordenando múltiplas frentes criativas simultaneamente",
    "Histórico de campanhas de sucesso com métricas claras de ROI/ROAS",
    "Vivência em ambientes dinâmicos, preferencialmente startups ou empresas em crescimento acelerado"
  ],
  
  conhecimentosTecnicos = [
    "Domínio avançado de plataformas de tráfego pago (Meta Ads, Google Ads)",
    "Proficiência em ferramentas de design (Canva, Figma ou similares)",
    "Familiaridade com edição de vídeo básica e/ou capacidade de briefar video makers",
    "Conhecimento sólido de CRMs e automações de marketing",
    "Capacidade analítica forte — ler dashboards, extrair insights, tomar decisões baseadas em dados"
  ],
  
  habilidadesEssenciais = [
    "Visão sistêmica e coordenação — enxergar como todas as peças se conectam",
    "Agilidade e rigor na execução — Ambiente dinâmico com múltiplos projetos simultâneos",
    "Comunicação clara e assertiva — traduzir estratégia em briefings compreensíveis",
    "Proatividade extrema — identificar gaps antes que aconteçam",
    "Mentalidade analítica e orientada a dados — medir, testar, comparar, aprender"
  ],
  
  vocePessoaCerta = [
    {
      titulo: "Você é inconformado com \"sempre foi assim\".",
      descricao: "Marketing digital muda toda semana. Algoritmos evoluem. Comportamentos mudam. E você não apenas acompanha — você antecipa. Para você, \"sempre fizemos assim\" não é argumento válido. Você questiona, testa, inova. Está sempre buscando o próximo nível de performance, mesmo quando os resultados já são bons."
    },
    {
      titulo: "Coordenação é seu superpoder natural.",
      descricao: "Você prospera gerenciando múltiplas frentes simultaneamente. Não se perde no caos — você cria ordem. Sabe priorizar sem perder visão do todo. Consegue dar direcionamento claro para cada membro do time sem microgerenciar. Para você, coordenar não é apenas delegar; é inspirar excelência em cada entrega."
    },
    {
      titulo: "Atitude de dono está no seu DNA.",
      descricao: "Você trata cada campanha como se a clínica fosse sua. Quando uma métrica cai, você não culpa o algoritmo ou o criativo — você assume responsabilidade e busca solução. Vê um gap na estratégia? Preenche sem esperar alguém mandar. O sucesso da Beauty Smile é seu sucesso."
    },
    {
      titulo: "Você tem obsessão saudável por performance.",
      descricao: "KPIs não são apenas números numa planilha. São histórias: quantas pessoas descobrimos? Quantas convertemos? Quanto investimos vs. quanto retornou? Você dorme pensando em como otimizar o ROAS. Acorda com ideias de testes A/B. E celebra cada melhoria incremental como se fosse uma grande vitória — porque é."
    },
    {
      titulo: "Comunicação com propósito te energiza.",
      descricao: "Você não quer apenas \"fazer marketing\". Você quer comunicar algo que importa. A ideia de criar campanhas que transformam percepções sobre odontologia, que educam pessoas sobre tecnologia revolucionária, que fazem alguém vencer o medo — isso te empolga profundamente. Propósito não é marketing pra você; é combustível."
    },
    {
      titulo: "Você tem fome de crescimento acelerado.",
      descricao: "Quer evoluir rápido em um ambiente que exige e recompensa excelência. Busca feedback, não foge dele. Vê desafios como oportunidades de aprender. Está sempre estudando — seja um novo recurso do Meta Ads, uma tendência de vídeo no Instagram, ou uma ferramenta de IA que pode otimizar processos. Para você, estagnação é inaceitável."
    },
    {
      titulo: "Você valoriza autonomia com responsabilidade.",
      descricao: "Não quer ser microgerenciado nem precisa de supervisão constante. Você quer liberdade para decidir — e está disposto a assumir o peso das consequências. Sabe quando escalar uma decisão e quando resolver sozinho. Confia em si mesmo e inspira confiança nos outros."
    }
  ],
  
  seriaIncrivel = [
    "Experiência prévia no setor de saúde, odontologia ou estética",
    "Vivência criando conteúdo para clínicas premium ou marcas de luxo",
    "Conhecimentos em growth hacking e estratégias de crescimento orgânico",
    "Familiaridade com produção de conteúdo audiovisual"
  ],
  
  oferecemos = [
    "Remuneração compatível com o mercado — valorizamos excelência",
    "Descontos em procedimentos para familiares",
    "Tratamentos Beauty Smile conforme política interna",
    "Acesso ao Wellhub — cuide do corpo enquanto cuida da comunicação",
    "Cursos e treinamentos — investimos no seu crescimento",
    "Plano de saúde — sua saúde é prioridade",
    "Ambiente de crescimento acelerado — 33 a 35 unidades nos próximos 5 anos",
    "Acesso a cases únicos no Brasil — tecnologia laser Fotona exclusiva",
    "Propósito genuíno — trabalho que transforma vidas"
  ],
  
  localDetalhado = "Beauty Smile Clínica Odontológica - Rua Desembargador Eliseu Guilherme, 53, Paraiso, São Paulo, SP",
  horarioDetalhado = "Segunda a sexta, horário comercial (flexibilidade para ajustes conforme demandas de campanha)",
  observacoesLocal = [
    "Trabalho 100% presencial",
    "Ambiente de startup com propósito",
    "Acesso direto aos fundadores e estratégia"
  ],
  
  convite = "Se você chegou até aqui e sentiu que este é o lugar onde você deveria estar, não deixe essa oportunidade passar. A Beauty Smile não é apenas um emprego. É um convite para fazer parte de algo radicalmente maior.",
  
  onCandidatar
}: Partial<VagaLPProps> = {}) {
  
  const handleCandidatar = () => {
    if (onCandidatar) {
      onCandidatar();
    } else {
      const element = document.getElementById('candidatura');
      element?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative min-h-screen">
      <BackgroundImage 
        background="gradient"
        overlayColor="bg-black"
        overlayOpacity={15}
        className="min-h-screen"
      >
        {/* Navbar Fixa */}
        <nav className="fixed top-0 left-0 right-0 z-50 py-4 px-4">
          <Glass variant="white" blur="xl" className="container mx-auto max-w-6xl px-6 py-4">
            <div className="flex items-center justify-between">
              <BeautySmileLogo type="horizontal" size="lg" variant="white" />

            </div>
          </Glass>
        </nav>

        {/* Hero Section com Imagem */}
        <section className="pt-32 pb-12 px-4">
          <div className="container mx-auto max-w-6xl">
            <GlassPanel variant="white" blur="xl" className="text-white">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                {/* Texto */}
                <div className="space-y-6">
                  <div className="space-y-3">
                    <p className="text-xl text-white/90 drop-shadow-md">{mensagemBoasVindas}</p>
                    <h1 className="text-4xl md:text-5xl drop-shadow-lg">{cargo}</h1>
                  </div>
                  
                  <p className="text-lg text-white/90 drop-shadow-md leading-relaxed">
                    {subtituloHero}
                  </p>
                  
                  {/* Info rápida */}
                  <div className="space-y-3 pt-4">
                    <div className="flex items-center gap-3">
                      <MapPin size={20} className="text-white flex-shrink-0" />
                      <span className="text-white/90 drop-shadow-sm">{local}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock size={20} className="text-white flex-shrink-0" />
                      <span className="text-white/90 drop-shadow-sm">{regime}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Rocket size={20} className="text-white flex-shrink-0" />
                      <span className="text-white/90 drop-shadow-sm">Início: {inicio}</span>
                    </div>
                    {salario && (
                      <div className="flex items-center gap-3">
                        <Briefcase size={20} className="text-white flex-shrink-0" />
                        <span className="text-white/90 drop-shadow-sm">{salario}</span>
                      </div>
                    )}
                  </div>

                  <GlassButton 
                    variant="white" 
                    hover 
                    className="px-8 py-4 text-white text-lg mt-6 drop-shadow-sm w-full md:w-auto inline-flex items-center justify-center gap-2"
                    onClick={handleCandidatar}
                  >
                    <span>Candidatar-se agora</span>
                    <ArrowRight size={20} />
                  </GlassButton>
                </div>

                {/* Imagem */}
                <div className="relative">
                  <Glass variant="white" blur="lg" className="p-2 aspect-square">
                    <img
                      src={heroImage}
                      alt={`Vaga ${cargo}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </Glass>
                </div>
              </div>
            </GlassPanel>
          </div>
        </section>

        {/* Sobre a Beauty Smile com Imagem */}
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-6xl">
            <GlassCard variant="white" blur="xl" className="text-white">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <h2 className="text-3xl md:text-4xl drop-shadow-md text-[rgb(255,255,255)]">Sobre a Beauty Smile</h2>
                  <div className="text-white/90 drop-shadow-sm leading-relaxed space-y-4">
                    {sobreBeautySmile.split('\n\n').map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <Glass variant="white" blur="lg" className="p-2 aspect-square">
                    <img
                      src={clinicaImage}
                      alt="Beauty Smile Clínica"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </Glass>
                </div>
              </div>
            </GlassCard>
          </div>
        </section>

        {/* Conheça o Time / Nos siga para saber mais */}
        {mostrarTeam && teamMembers && teamMembers.length > 0 && (
          <section className="py-12 px-4">
            <div className="container mx-auto max-w-6xl">
              <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl text-white drop-shadow-lg mb-3">
                  Nos Siga Para Saber Mais
                </h2>
                <p className="text-white/80 text-lg drop-shadow-md">
                  Conheça quem está por trás da revolução
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {teamMembers.map((member, index) => (
                  <GlassCard 
                    key={index} 
                    variant="white" 
                    blur="xl" 
                    className="text-white text-center"
                  >
                    <div className="space-y-4">
                      {/* Imagem */}
                      <div className="relative w-full aspect-square mb-4">
                        <Glass variant="white" blur="sm" className="p-2 w-full h-full">
                          <ImageWithFallback
                            src={member.image}
                            alt={member.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </Glass>
                      </div>

                      {/* Info */}
                      <div className="space-y-2">
                        <h3 className="text-xl drop-shadow-md">{member.name}</h3>
                        <p className="text-white/70 text-sm drop-shadow-sm">{member.role}</p>
                      </div>

                      {/* Social Links */}
                      <div className="flex justify-center gap-4 pt-2">
                        {member.instagram && (
                          <Glass 
                            variant="white" 
                            blur="sm" 
                            className="p-2 hover:bg-white/25 transition-all duration-200 cursor-pointer"
                            onClick={() => window.open('https://www.instagram.com/fernandocostant/', '_blank')}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-white/80 drop-shadow-sm">Instagram</span>
                            </div>
                          </Glass>
                        )}
                        {member.linkedin && (
                          <Glass 
                            variant="white" 
                            blur="sm" 
                            className="p-2 hover:bg-white/25 transition-all duration-200 cursor-pointer"
                            onClick={() => window.open('https://www.linkedin.com/in/fernando-costa-neto-15015051/', '_blank')}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-white/80 drop-shadow-sm">LinkedIn</span>
                            </div>
                          </Glass>
                        )}
                        {member.youtube && (
                          <Glass 
                            variant="white" 
                            blur="sm" 
                            className="p-2 hover:bg-white/25 transition-all duration-200 cursor-pointer"
                            onClick={() => window.open('https://www.youtube.com/@beautysmilefotona', '_blank')}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-white/80 drop-shadow-sm">YouTube</span>
                            </div>
                          </Glass>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* O que você vai fazer */}
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-6xl">
            <GlassCard variant="white" blur="xl" className="text-white">
              <div className="space-y-6">
                <h2 className="text-3xl md:text-4xl drop-shadow-md">
                  O Que Você Vai Fazer (E O Impacto Que Vai Gerar)
                </h2>
                
                {/* Introdução */}
                <p className="text-white/90 text-lg drop-shadow-sm leading-relaxed">
                  {oQueVaiFazer.introducao}
                </p>

                {/* Descrição Maestro */}
                <p className="text-white/90 drop-shadow-sm leading-relaxed">
                  {oQueVaiFazer.descricaoMaestro}
                </p>

                {/* Seu dia a dia */}
                <div className="space-y-4 pt-4">
                  <h3 className="text-xl drop-shadow-md text-white/95">
                    {oQueVaiFazer.diaDiaLabel}
                  </h3>
                  <div className="space-y-3">
                    {oQueVaiFazer.diaDia.map((item, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <CheckCircle2 size={20} className="text-white/70 flex-shrink-0 mt-1" />
                        <p className="text-white/90 drop-shadow-sm">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mas aqui está o que realmente importa */}
                <div className="space-y-4 pt-4">
                  <h3 className="text-xl drop-shadow-md text-white/95">
                    {oQueVaiFazer.importaLabel}
                  </h3>
                  <p className="text-white/90 drop-shadow-sm leading-relaxed">
                    {oQueVaiFazer.importa}
                  </p>
                  <p className="text-white/90 drop-shadow-sm leading-relaxed">
                    {oQueVaiFazer.coordenacao}
                  </p>
                </div>

                {/* Seu impacto - Destaque */}
                <Glass variant="white" blur="md" className="p-6 mt-6 border-l-4 border-white/40">
                  <div className="space-y-4">
                    <h3 className="text-xl drop-shadow-md text-white/95">
                      {oQueVaiFazer.impactoLabel}
                    </h3>
                    <ul className="space-y-3">
                      {oQueVaiFazer.impacto.map((item, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <span className="text-white/60 mt-1">•</span>
                          <span className="text-white/90 drop-shadow-sm leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Glass>

                {/* Conclusão - Destaque */}
                <Glass variant="white" blur="md" className="p-6 border-l-4 border-white/40">
                  <p className="text-white/90 text-lg drop-shadow-sm leading-relaxed italic">
                    {oQueVaiFazer.conclusao}
                  </p>
                </Glass>
              </div>
            </GlassCard>
          </div>
        </section>

        {/* Responsabilidades */}
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-6xl">
            <GlassCard variant="white" blur="xl" className="text-white">
              <div className="space-y-6">
                <h2 className="text-3xl md:text-4xl drop-shadow-md text-[rgb(255,255,255)]">Suas Principais Responsabilidades</h2>
                <div className="grid gap-4">
                  {responsabilidades.map((resp, index) => (
                    <Glass key={index} variant="white" blur="md" className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 backdrop-blur-md">
                          <span className="text-white drop-shadow-sm">{index + 1}</span>
                        </div>
                        <p className="text-white/90 drop-shadow-sm pt-1">{resp}</p>
                      </div>
                    </Glass>
                  ))}
                </div>
              </div>
            </GlassCard>
          </div>
        </section>

        {/* O que você precisa ter */}
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="mb-8 text-center">
              <h2 className="text-4xl md:text-5xl text-white drop-shadow-lg mb-2">O Que Você Precisa Ter</h2>
              <p className="text-white/80 text-lg drop-shadow-md">Requisitos essenciais para a posição</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Formação */}
              <GlassCard variant="white" blur="xl" className="text-white">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                      <GraduationCap size={24} className="text-white" />
                    </div>
                    <h3 className="text-2xl drop-shadow-md">Formação</h3>
                  </div>
                  <ul className="space-y-3">
                    {formacao.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-white/60 mt-1">•</span>
                        <span className="text-white/90 drop-shadow-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </GlassCard>

              {/* Experiência */}
              <GlassCard variant="white" blur="xl" className="text-white">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                      <Award size={24} className="text-white" />
                    </div>
                    <h3 className="text-2xl drop-shadow-md">Experiência</h3>
                  </div>
                  <ul className="space-y-3">
                    {experiencia.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-white/60 mt-1">•</span>
                        <span className="text-white/90 drop-shadow-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </GlassCard>

              {/* Conhecimentos Técnicos */}
              <GlassCard variant="white" blur="xl" className="text-white">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                      <Briefcase size={24} className="text-white" />
                    </div>
                    <h3 className="text-2xl drop-shadow-md text-white">Conhecimentos Técnicos</h3>
                  </div>
                  <ul className="space-y-3">
                    {conhecimentosTecnicos.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-white/60 mt-1">•</span>
                        <span className="text-white/90 drop-shadow-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </GlassCard>

              {/* Habilidades Essenciais */}
              <GlassCard variant="white" blur="xl" className="text-white">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                      <Heart size={24} className="text-white" />
                    </div>
                    <h3 className="text-2xl drop-shadow-md">Habilidades Essenciais</h3>
                  </div>
                  <ul className="space-y-3">
                    {habilidadesEssenciais.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-white/60 mt-1">•</span>
                        <span className="text-white/90 drop-shadow-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </GlassCard>
            </div>
          </div>
        </section>

        {/* Você é a pessoa certa se */}
        {vocePessoaCerta && vocePessoaCerta.length > 0 && (
          <section className="py-12 px-4">
            <div className="container mx-auto max-w-6xl">
              <GlassCard variant="white" blur="xl" className="text-white">
                <div className="space-y-6">
                  <h2 className="text-3xl md:text-4xl drop-shadow-md text-white">
                    Você É A Pessoa Certa Para Este Cargo Se:
                  </h2>
                  <div className="grid gap-6">
                    {vocePessoaCerta.map((item, index) => (
                      <Glass key={index} variant="white" blur="md" className="p-6">
                        <div className="flex items-start gap-4">
                          <span className="text-2xl flex-shrink-0">✨</span>
                          <div className="space-y-3">
                            <h3 className="text-lg text-white drop-shadow-md">{item.titulo}</h3>
                            <p className="text-white/90 drop-shadow-sm leading-relaxed">{item.descricao}</p>
                          </div>
                        </div>
                      </Glass>
                    ))}
                  </div>
                </div>
              </GlassCard>
            </div>
          </section>
        )}

        {/* Seria incrível se você também tivesse */}
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-6xl">
            <GlassCard variant="white" blur="xl" className="text-white">
              <div className="space-y-6">
                <h2 className="text-3xl md:text-4xl drop-shadow-md">Seria Incrível Se Você Também Tivesse</h2>
                <p className="text-white/70 drop-shadow-sm">Diferenciais que podem destacar sua candidatura</p>
                <div className="grid gap-3">
                  {seriaIncrivel.map((item, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <span className="text-white/60 text-xl flex-shrink-0 mt-1">⭐</span>
                      <p className="text-white/90 drop-shadow-sm">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          </div>
        </section>

        {/* O que oferecemos */}
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="mb-8 text-center">
              <h2 className="text-4xl md:text-5xl text-white drop-shadow-lg mb-2">O Que Oferecemos</h2>
              <p className="text-white/80 text-lg drop-shadow-md">Benefícios e vantagens de fazer parte do time</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {oferecemos.map((beneficio, index) => (
                <Glass key={index} variant="white" blur="lg" className="p-4 flex items-start gap-3">
                  <CheckCircle2 size={24} className="text-white flex-shrink-0 mt-1" />
                  <span className="text-white/90 drop-shadow-sm">{beneficio}</span>
                </Glass>
              ))}
            </div>
          </div>
        </section>

        {/* Local e Horário */}
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-6xl">
            <GlassCard variant="white" blur="xl" className="text-white">
              <div className="space-y-6">
                <h2 className="text-3xl md:text-4xl drop-shadow-md">Local e Horário de Trabalho</h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                        <MapPin size={20} className="text-white" />
                      </div>
                      <h3 className="text-xl drop-shadow-md">Local</h3>
                    </div>
                    <p className="text-white/90 drop-shadow-sm pl-13">
                      {localDetalhado || local}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                        <Clock size={20} className="text-white" />
                      </div>
                      <h3 className="text-xl drop-shadow-md">Horário</h3>
                    </div>
                    <p className="text-white/90 drop-shadow-sm pl-13">
                      {horarioDetalhado || regime}
                    </p>
                  </div>
                </div>

                {observacoesLocal && observacoesLocal.length > 0 && (
                  <Glass variant="white" blur="md" className="p-4 mt-6">
                    <h4 className="text-lg drop-shadow-md mb-3 text-[rgb(255,255,255)]">Observações:</h4>
                    <ul className="space-y-2">
                      {observacoesLocal.map((obs, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-white/60 mt-1">•</span>
                          <span className="text-white/80 drop-shadow-sm">{obs}</span>
                        </li>
                      ))}
                    </ul>
                  </Glass>
                )}
              </div>
            </GlassCard>
          </div>
        </section>

        {/* Jornada de Candidatura */}
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl text-white drop-shadow-lg mb-4">
                🚀 JORNADA DE CANDIDATURA NA BEAUTY SMILE
              </h2>
              <p className="text-xl text-white drop-shadow-md mb-2">
                Não contratamos funcionários. Recrutamos cruzados.
              </p>
              <p className="text-lg text-white/90 drop-shadow-md">
                Por isso, nosso processo é rigoroso, transparente e desenhado para garantir que você é a pessoa certa — e que somos a empresa certa para você.
              </p>
              <Glass variant="white" blur="md" className="inline-block px-6 py-3 mt-4">
                <p className="text-white drop-shadow-sm">
                  <Calendar className="inline-block w-5 h-5 mr-2 mb-1" />
                  Tempo total do processo: Aproximadamente 30 dias da candidatura até a contratação.
                </p>
              </Glass>
            </div>

            {/* Título das Etapas */}
            <div className="mb-8">
              <h3 className="text-3xl md:text-4xl text-white drop-shadow-lg text-center mb-2">
                📍 AS 5 ETAPAS DA SUA JORNADA
              </h3>
            </div>

            {/* ETAPA 1 */}
            <div className="mb-8">
              <GlassCard variant="white" blur="xl" className="text-white">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 backdrop-blur-md">
                      <FileText size={28} className="text-white" />
                    </div>
                    <h3 className="text-2xl md:text-3xl drop-shadow-md">
                      ETAPA 1: CANDIDATURA INICIAL 📝
                    </h3>
                  </div>

                  <div className="space-y-4 pl-0 md:pl-18">
                    <div>
                      <h4 className="text-lg drop-shadow-md mb-2 text-[rgb(255,255,255)] font-bold">O que acontece:</h4>
                      <p className="text-white/90 drop-shadow-sm leading-relaxed">
                        Você preenche nosso formulário de candidatura com perguntas sobre sua jornada profissional, motivações e alinhamento com nosso propósito.
                      </p>
                    </div>

                    <div>
                      <h4 className="text-lg drop-shadow-md mb-2 text-[rgb(255,255,255)] font-bold">O que buscamos:</h4>
                      <p className="text-white/90 drop-shadow-sm leading-relaxed">
                        Entender quem você é além do currículo. Queremos saber o que te move, o que você valoriza, e por que a Beauty Smile faz sentido para você.
                      </p>
                    </div>

                    <Glass variant="white" blur="md" className="p-4 border-l-4 border-white/40">
                      <p className="text-white/90 drop-shadow-sm">
                        <strong className="text-white drop-shadow-md">Próximo passo:</strong> Se seu perfil se alinhar com o que buscamos, você recebe o convite para a próxima fase.
                      </p>
                    </Glass>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* ETAPA 2 */}
            <div className="mb-8">
              <GlassCard variant="white" blur="xl" className="text-white">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 backdrop-blur-md">
                      <Brain size={28} className="text-white" />
                    </div>
                    <h3 className="text-2xl md:text-3xl drop-shadow-md">
                      ETAPA 2: AVALIAÇÃO DE PERFIL COMPORTAMENTAL 🧠
                    </h3>
                  </div>

                  <div className="space-y-4 pl-0 md:pl-18">
                    <div>
                      <h4 className="text-lg drop-shadow-md mb-2 text-[rgb(255,255,255)] font-bold">O que acontece:</h4>
                      <p className="text-white/90 drop-shadow-sm leading-relaxed mb-3">
                        Você realiza duas avaliações científicas de personalidade:
                      </p>
                      <ul className="space-y-2 pl-4">
                        <li className="flex items-start gap-2">
                          <span className="text-white/60 mt-1">•</span>
                          <span className="text-white/90 drop-shadow-sm"><strong className="text-white">Teste Big Five</strong> — avalia suas características comportamentais em 5 dimensões fundamentais</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-white/60 mt-1">•</span>
                          <span className="text-white/90 drop-shadow-sm"><strong className="text-white">Teste DISC</strong> — mapeia seu estilo comportamental e como você interage em ambientes de trabalho</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-lg drop-shadow-md mb-2 text-[rgb(255,255,255)] font-bold">Por que fazemos isso:</h4>
                      <p className="text-white/90 drop-shadow-sm leading-relaxed">
                        Porque fit cultural é tão importante quanto competência técnica. Queremos que você prospere aqui, e isso só acontece quando sua forma de ser se alinha com nossos valores. Esses testes nos ajudam a entender como você se comunica, toma decisões e se relaciona — garantindo que há match real entre você e nossa cultura.
                      </p>
                    </div>

                    <Glass variant="white" blur="md" className="p-4 border-l-4 border-white/40">
                      <p className="text-white/90 drop-shadow-sm">
                        <strong className="text-white drop-shadow-md">Próximo passo:</strong> Se houver forte alinhamento comportamental, agendamos sua entrevista online.
                      </p>
                    </Glass>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* ETAPA 3 */}
            <div className="mb-8">
              <GlassCard variant="white" blur="xl" className="text-white">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 backdrop-blur-md">
                      <Video size={28} className="text-white" />
                    </div>
                    <h3 className="text-2xl md:text-3xl drop-shadow-md">
                      ETAPA 3: ENTREVISTA ONLINE + AVALIAÇÃO COGNITIVA 💻🧩
                    </h3>
                  </div>

                  <div className="space-y-4 pl-0 md:pl-18">
                    <div>
                      <h4 className="text-lg drop-shadow-md mb-2 text-[rgb(255,255,255)] font-bold">O que acontece:</h4>
                      <ul className="space-y-2 pl-4">
                        <li className="flex items-start gap-2">
                          <span className="text-white/60 mt-1">•</span>
                          <span className="text-white/90 drop-shadow-sm"><strong className="text-white">30 minutos:</strong> Entrevista online com nosso time de Gente & Gestão</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-white/60 mt-1">•</span>
                          <span className="text-white/90 drop-shadow-sm"><strong className="text-white">30 minutos:</strong> Teste de Raciocínio Lógico (Raven)</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-lg drop-shadow-md mb-2 text-[rgb(255,255,255)] font-bold">O que buscamos:</h4>
                      <p className="text-white/90 drop-shadow-sm leading-relaxed">
                        Na entrevista, queremos conhecer você de verdade — suas experiências, motivações, fit com a vaga. No teste cognitivo, avaliamos capacidade de resolução de problemas e raciocínio lógico.
                      </p>
                    </div>

                    <Glass variant="white" blur="md" className="p-4 border-l-4 border-white/40">
                      <p className="text-white/90 drop-shadow-sm">
                        <strong className="text-white drop-shadow-md">Próximo passo:</strong> Se a entrevista e o teste confirmarem que você tem potencial para o cargo, você é convidado para a etapa presencial.
                      </p>
                    </Glass>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* ETAPA 4 */}
            <div className="mb-8">
              <GlassCard variant="white" blur="xl" className="text-white">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 backdrop-blur-md">
                      <Building2 size={28} className="text-white" />
                    </div>
                    <h3 className="text-2xl md:text-3xl drop-shadow-md">
                      ETAPA 4: ENTREVISTA PRESENCIAL + IMERSÃO CULTURAL 🏢❤️
                    </h3>
                  </div>

                  <div className="space-y-4 pl-0 md:pl-18">
                    <div>
                      <h4 className="text-lg drop-shadow-md mb-2 text-[rgb(255,255,255)] font-bold">O que acontece:</h4>
                      <p className="text-white/90 drop-shadow-sm leading-relaxed mb-3">
                        Você vem conhecer a Beauty Smile pessoalmente e passa por duas atividades:
                      </p>
                      <ul className="space-y-2 pl-4">
                        <li className="flex items-start gap-2">
                          <span className="text-white/60 mt-1">•</span>
                          <span className="text-white/90 drop-shadow-sm"><strong className="text-white">Entrevista presencial:</strong> Conversa aprofundada com liderança e/ou fundadores</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-white/60 mt-1">•</span>
                          <span className="text-white/90 drop-shadow-sm"><strong className="text-white">Teste Cultural:</strong> Leitura do Manifesto da Beauty Smile + questionário sobre nossa cultura, valores e propósito</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-lg drop-shadow-md mb-2 text-[rgb(255,255,255)] font-bold">Por que fazemos isso:</h4>
                      <p className="text-white/90 drop-shadow-sm leading-relaxed">
                        Porque você precisa sentir se este é o lugar certo para você. E nós precisamos ter certeza de que você não apenas entendeu, mas comprou genuinamente nossa missão.
                      </p>
                    </div>

                    <Glass variant="white" blur="md" className="p-4 border-l-4 border-white/40">
                      <p className="text-white/90 drop-shadow-sm">
                        <strong className="text-white drop-shadow-md">Próximo passo:</strong> Se houver match completo — técnico, comportamental e cultural — partimos para a contratação.
                      </p>
                      <p className="text-white/80 drop-shadow-sm mt-2 text-sm">
                        ⏱️ Tempo após esta etapa: Aproximadamente 15 dias para formalização.
                      </p>
                    </Glass>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* ETAPA 5 */}
            <div className="mb-12">
              <GlassCard variant="white" blur="xl" className="text-white">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 backdrop-blur-md">
                      <PartyPopper size={28} className="text-white" />
                    </div>
                    <h3 className="text-2xl md:text-3xl drop-shadow-md">
                      ETAPA 5: BEM-VINDO À FAMÍLIA BEAUTY SMILE! 🎉🦷
                    </h3>
                  </div>

                  <div className="space-y-4 pl-0 md:pl-18">
                    <div>
                      <h4 className="text-lg drop-shadow-md mb-2 text-[rgb(255,255,255)] font-bold">O que acontece:</h4>
                      <p className="text-white/90 drop-shadow-sm leading-relaxed">
                        Você recebe a proposta formal, assinamos o contrato, e começamos a preparar sua chegada.
                      </p>
                    </div>

                    <div>
                      <h4 className="text-lg drop-shadow-md mb-2 text-[rgb(255,255,255)] font-bold">O que vem depois:</h4>
                      <p className="text-white/90 drop-shadow-sm leading-relaxed">
                        Um onboarding completo para você se integrar à cultura, entender os processos, conhecer o time e começar sua jornada de transformação — da sua carreira e das vidas dos nossos pacientes.
                      </p>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Linha do Tempo */}
            <div className="mb-12">
              <GlassCard variant="white" blur="xl" className="text-white">
                <h3 className="text-2xl md:text-3xl drop-shadow-md mb-6 text-center">
                  ⏳ LINHA DO TEMPO RESUMIDA
                </h3>
                
                <div className="space-y-6">
                  {/* Timeline Visual */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="text-center">
                      <Glass variant="white" blur="md" className="p-4 h-full">
                        <FileText className="w-8 h-8 mx-auto mb-2 text-white" />
                        <p className="text-sm text-white drop-shadow-sm">CANDIDATURA</p>
                      </Glass>
                    </div>
                    <div className="text-center">
                      <Glass variant="white" blur="md" className="p-4 h-full">
                        <Brain className="w-8 h-8 mx-auto mb-2 text-white" />
                        <p className="text-sm text-white drop-shadow-sm">BIG FIVE + DISC</p>
                      </Glass>
                    </div>
                    <div className="text-center">
                      <Glass variant="white" blur="md" className="p-4 h-full">
                        <Video className="w-8 h-8 mx-auto mb-2 text-white" />
                        <p className="text-sm text-white drop-shadow-sm">ENTREVISTA ONLINE + RAVEN</p>
                      </Glass>
                    </div>
                    <div className="text-center">
                      <Glass variant="white" blur="md" className="p-4 h-full">
                        <Building2 className="w-8 h-8 mx-auto mb-2 text-white" />
                        <p className="text-sm text-white drop-shadow-sm">PRESENCIAL + CULTURA</p>
                      </Glass>
                    </div>
                    <div className="text-center">
                      <Glass variant="white" blur="md" className="p-4 h-full">
                        <PartyPopper className="w-8 h-8 mx-auto mb-2 text-white" />
                        <p className="text-sm text-white drop-shadow-sm">BEM-VINDO!</p>
                      </Glass>
                    </div>
                  </div>

                  {/* Tempo total */}
                  <Glass variant="white" blur="md" className="p-6 text-center">

                    <p className="text-lg text-white drop-shadow-md mt-3">
                      Tempo total: Aproximadamente 30 dias da candidatura até sua chegada.
                    </p>
                  </Glass>
                </div>
              </GlassCard>
            </div>

            {/* Por que processo rigoroso */}
            <GlassCard variant="white" blur="xl" className="text-white">
              <div className="space-y-6">
                <h3 className="text-2xl md:text-3xl drop-shadow-md text-center">
                  💭 POR QUE UM PROCESSO TÃO RIGOROSO?
                </h3>
                
                <div className="space-y-4">
                  <p className="text-white/90 drop-shadow-sm leading-relaxed text-center text-lg">
                    Porque não estamos contratando pessoas para cumprir tarefas.
                  </p>
                  <p className="text-white drop-shadow-md leading-relaxed text-center text-lg">
                    Estamos recrutando cruzados para uma missão: eliminar o trauma odontológico e transformar vidas através da tecnologia e do cuidado genuíno.
                  </p>
                </div>

                <Glass variant="white" blur="md" className="p-6 mt-6">
                  <p className="text-white/90 drop-shadow-sm leading-relaxed mb-4">
                    Cada etapa do processo existe para garantir três coisas:
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 size={24} className="text-white flex-shrink-0 mt-1" />
                      <p className="text-white/90 drop-shadow-sm">
                        <strong className="text-white">Você é a pessoa certa</strong> — tem as competências, o comportamento e os valores alinhados
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 size={24} className="text-white flex-shrink-0 mt-1" />
                      <p className="text-white/90 drop-shadow-sm">
                        <strong className="text-white">Este é o lugar certo para você</strong> — a cultura, o propósito e o ambiente fazem sentido para sua vida
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 size={24} className="text-white flex-shrink-0 mt-1" />
                      <p className="text-white/90 drop-shadow-sm">
                        <strong className="text-white">Juntos, vamos longe</strong> — há match real, não apenas contratação por necessidade
                      </p>
                    </div>
                  </div>
                </Glass>
              </div>
            </GlassCard>
          </div>
        </section>

        {/* Convite Final */}
        <section className="py-12 px-4" id="candidatura">
          <div className="container mx-auto max-w-6xl">
            <GlassPanel variant="white" blur="xl" className="text-white text-center">
              <div className="space-y-8">
                <h2 className="text-4xl md:text-5xl drop-shadow-lg">
                  Pronto Para Amplificar Uma Revolução?
                </h2>
                <div className="text-white/90 drop-shadow-md leading-relaxed max-w-3xl mx-auto space-y-4">
                  {convite.split('\n\n').map((paragraph, index) => (
                    <p key={index} className="text-lg text-[rgb(220,220,220)]">{paragraph}</p>
                  ))}
                </div>
                <GlassButton 
                  variant="white" 
                  hover 
                  className="px-10 py-5 text-white text-xl mt-6 drop-shadow-sm flex items-center justify-center mx-auto"
                  onClick={handleCandidatar}
                >
                  Candidatar-se Agora <ArrowRight className="ml-2" size={24} />
                </GlassButton>
                
                <p className="text-white/70 drop-shadow-sm mt-4">
                  Estamos ansiosos para conhecer você. Bem-vindo à família Beauty Smile. 🦷✨
                </p>
              </div>
            </GlassPanel>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-4">
          <div className="container mx-auto max-w-6xl">
            <Glass variant="white" blur="xl" className="p-8">
              <div className="grid md:grid-cols-3 gap-8 text-white">
                {/* Logo e descrição */}
                <div className="space-y-4">
                  <BeautySmileLogo type="vertical" size="md" variant="white" />
                  <p className="text-white/70 text-sm drop-shadow-sm">
                    Transformando sorrisos e vidas através da odontologia sem trauma
                  </p>
                </div>

                {/* Contato */}
                <div className="space-y-3">
                  <h3 className="text-lg drop-shadow-md">Contato</h3>
                  <div className="space-y-2 text-sm text-white/80 drop-shadow-sm">
                    <p>📧 rh@beautysmile.com.br</p>
                    <p>📱 (11) 3000-0000</p>
                    <p>📍 São Paulo, SP</p>
                  </div>
                </div>

                {/* Redes Sociais */}
                <div className="space-y-3">
                  <h3 className="text-lg drop-shadow-md">Redes Sociais</h3>
                  <div className="space-y-2 text-sm text-white/80 drop-shadow-sm">
                    <p>Instagram: @beautysmile</p>
                    <p>LinkedIn: Beauty Smile</p>
                    <p>YouTube: Beauty Smile</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/20 text-center">
                <p className="text-white/60 text-sm drop-shadow-sm">
                  © 2025 Beauty Smile. Todos os direitos reservados.
                </p>
              </div>
            </Glass>
          </div>
        </footer>

      </BackgroundImage>
    </div>
  );
}
