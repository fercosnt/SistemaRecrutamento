import React from 'react';
import { BackgroundImage } from '../BackgroundImage';
import { GlassCard } from '../ui/glass';
import { BeautySmileLogo } from '../BeautySmileLogo';
import { ArrowRight } from 'lucide-react';

export function ManifestoPage() {
  return (
    <BackgroundImage background="darkBlue">
      <div className="min-h-screen py-16 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <BeautySmileLogo type="vertical" variant="white" size="md" className="drop-shadow-lg" />
          </div>

          {/* Instrução */}
          <GlassCard className="mb-8 p-8 text-center bg-white/15 border-white/30">
            <p className="text-white drop-shadow-sm text-[16px]">
              Leia atentamente nosso manifesto. Na próxima etapa, você responderá 7 perguntas sobre cultura e valores.
            </p>
          </GlassCard>

          {/* Manifesto */}
          <GlassCard className="p-8 md:p-12 bg-white/15 border-white/30">
            <div className="space-y-12">
              
              {/* Título Principal */}
              <div className="text-center space-y-4">
                <h1 className="text-white drop-shadow-lg text-[28px] font-bold">
                  🦷 BEM-VINDO À REVOLUÇÃO DA ODONTOLOGIA
                </h1>
                <h2 className="text-white drop-shadow-md text-[24px]">
                  MANIFESTO BEAUTY SMILE
                </h2>
                <p className="text-white drop-shadow-sm text-[16px] italic">
                  Para candidatos que não aceitam "sempre foi assim"
                </p>
              </div>

              <div className="border-t border-white/20" />

              {/* Seção 1 */}
              <section className="space-y-4">
                <h2 className="text-white drop-shadow-md text-[24px] font-bold">
                  💭 E SE VOCÊ PUDESSE DORMIR NA CADEIRA DO DENTISTA?
                </h2>
                
                <p className="text-white drop-shadow-sm text-[16px]">
                  Pense por um segundo: <strong>quantas pessoas você conhece que têm pavor de ir ao dentista?</strong>
                </p>

                <p className="text-white drop-shadow-sm text-[16px]">
                  Milhões de brasileiros adiam tratamentos por anos. Crianças crescem aprendendo a temer o consultório odontológico. O barulho do "motorzinho" virou gatilho automático de ansiedade. Famílias inteiras carregam esse trauma de geração em geração.
                </p>

                <p className="text-white drop-shadow-sm text-[16px]">
                  <strong>E se nada disso fosse inevitável?</strong>
                </p>

                <p className="text-white drop-shadow-sm text-[16px]">
                  E se a dor, o sangramento, o trauma que atravessa gerações fossem apenas reflexos de um sistema que se acomodou ao "sempre foi assim"? E se existisse uma tecnologia capaz de transformar completamente a experiência odontológica?
                </p>

                <div className="bg-white/10 border-l-4 border-[#35BFAD] p-6 rounded">
                  <p className="text-white drop-shadow-sm text-[16px] italic">
                    Essa não foi uma pergunta retórica para três visionários. Foi o início de tudo.
                  </p>
                </div>
              </section>

              {/* Seção 2 */}
              <section className="space-y-6">
                <h2 className="text-white drop-shadow-md text-[24px] font-bold">
                  🌟 NOSSA HISTÓRIA: QUANDO O IMPOSSÍVEL ENCONTROU TRÊS INQUIETOS
                </h2>

                <div className="space-y-4">
                  <h3 className="text-white drop-shadow-md text-[20px] font-bold">
                    Fernando Costa Jr. — O Pioneiro
                  </h3>
                  <p className="text-white drop-shadow-sm text-[16px]">
                    Em 1986, quando um professor catedrático da USP afirmou que "implantes não funcionam", ele não aceitou. Provou o contrário e transformou implantes dentários de procedimento experimental em realidade cotidiana. Com <strong>40 anos de sucesso consolidado</strong>, a maioria escolheria desacelerar. <strong>Ele escolheu recomeçar.</strong>
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-white drop-shadow-md text-[20px] font-bold">
                    Fernando Costa Neto — O Revolucionário
                  </h3>
                  <p className="text-white drop-shadow-sm text-[16px]">
                    Cresceu entre dois mundos: a clínica do pai e a fábrica da mãe. Aos 14 anos já gerenciava finanças. Viveu em três países, fundou startup, produziu eventos no Carnaval Carioca.
                  </p>
                  <p className="text-white drop-shadow-sm text-[16px]">
                    Essa busca por impacto o levou a presentear o pai com um laser — um gesto que uniria família, legado e revolução. Como ele mesmo diz:
                  </p>
                  <div className="bg-white/10 border-l-4 border-[#35BFAD] p-6 rounded">
                    <p className="text-white drop-shadow-sm text-[16px] italic">
                      "Quando descobri esse laser Fotona, vi que era o que estava buscando até hoje. A possibilidade de proporcionar tratamento sem dor, sem sensibilidade, sem pós-operatório traumático para os pacientes me encantou."
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-white drop-shadow-md text-[20px] font-bold">
                    Ricardo Blaustein — O Visionário
                  </h3>
                  <p className="text-white drop-shadow-sm text-[16px]">
                    Estudou cinema em Los Angeles, o que lhe deu olhar único para os negócios. Como CEO da Fotona Brasil, transformou a marca em líder absoluta em dermatologia e ginecologia — <strong>mais de mil equipamentos instalados, mais de 500 clínicas parceiras</strong>.
                  </p>
                  <p className="text-white drop-shadow-sm text-[16px]">
                    Mas viu além: se a Fotona era tão eficaz na pele, por que seu potencial revolucionário na odontologia permanecia inexplorado no Brasil?
                  </p>
                </div>
              </section>

              {/* Seção 3 */}
              <section className="space-y-4">
                <h2 className="text-white drop-shadow-md text-[24px] font-bold">
                  🔥 O SACRIFÍCIO: QUANDO CONVICÇÃO VIRA CORAGEM
                </h2>

                <p className="text-white drop-shadow-sm text-[16px]">
                  O encontro dos três não foi acaso. Fernando Neto viajava de Goiânia a São Paulo apenas para assistir palestras sobre o laser Fotona. O encontro com Ricardo foi transformador — houve conexão genuína, e dali nasceu algo maior que uma sociedade: <strong>uma cruzada compartilhada</strong>.
                </p>

                <p className="text-white drop-shadow-sm text-[16px]">
                  Ali nasceu uma convicção:
                </p>

                <div className="bg-white/10 border-l-4 border-[#35BFAD] p-6 rounded">
                  <p className="text-white drop-shadow-sm text-[16px] italic">
                    "Não seria 'mais uma clínica com laser'. Seria a única clínica no mundo exclusivamente dedicada ao laser Fotona na odontologia."
                  </p>
                </div>

                <p className="text-white drop-shadow-sm text-[16px]">
                  <strong>Mas essa visão exigia um preço.</strong>
                </p>

                <p className="text-white drop-shadow-sm text-[16px]">
                  Para provar que era real, os fundadores fecharam <strong>clínicas de mais de 30 anos de sucesso em Goiânia, no Rio de Janeiro e em São Paulo</strong>. Décadas de história, base sólida de clientes, reputação consolidada, estabilidade financeira — tudo foi deixado para trás.
                </p>

                <p className="text-white drop-shadow-sm text-[16px]">
                  Por quê? Para apostar tudo em um projeto completamente novo em São Paulo, com uma tecnologia que poucos conheciam.
                </p>

                <p className="text-white drop-shadow-sm text-[16px]">
                  Para dominar completamente a ciência, Fernando Neto atendeu pacientes <strong>gratuitamente por seis meses inteiros</strong>, aperfeiçoando técnicas, desenvolvendo protocolos. Depois, foi além: realizou <strong>dois mestrados internacionais</strong> — em Roma e no Instituto de Pesquisa da Fotona, na Eslovênia.
                </p>
              </section>

              {/* Seção 4 */}
              <section className="space-y-4">
                <h2 className="text-white drop-shadow-md text-[24px] font-bold">
                  ✨ A PROVA: QUANDO CETICISMO VIRA EVIDÊNCIA
                </h2>

                <p className="text-white drop-shadow-sm text-[16px]">
                  Os primeiros casos transformadores provaram que a visão estava certa:
                </p>

                <div className="space-y-4">
                  <div className="bg-white/10 p-4 rounded">
                    <p className="text-white drop-shadow-sm text-[16px]">
                      <strong>Luzia</strong> — cujos dentes todos os dentistas queriam extrair — teve tudo salvo. Como ela diz: <em>"Ninguém conseguia resolver. Todos queriam só arrancar meus dentes. Aqui salvaram o que eu achava impossível."</em>
                    </p>
                  </div>

                  <div className="bg-white/10 p-4 rounded">
                    <p className="text-white drop-shadow-sm text-[16px]">
                      <strong>Márcio</strong> — curou apneia grave (de nível 27 para zero) sem cirurgia. <em>"Foi a noite que mais dormi bem na vida."</em>
                    </p>
                  </div>

                  <div className="bg-white/10 p-4 rounded">
                    <p className="text-white drop-shadow-sm text-[16px]">
                      <strong>Marcos Paulo</strong> — tinha fobia paralisante, quase quebrou um consultório de tanto pavor. Hoje? <strong>Dorme durante os procedimentos.</strong> Realizou extração de raiz com laser em 15 minutos e foi trabalhar no mesmo dia.
                    </p>
                  </div>
                </div>

                <p className="text-white drop-shadow-sm text-[16px]">
                  <strong>E os resultados não param:</strong>
                </p>

                <ul className="space-y-2">
                  <li className="text-white drop-shadow-sm text-[16px]">🦷 <strong>Mais de 2.200 vidas tocadas</strong> desde 2023</li>
                  <li className="text-white drop-shadow-sm text-[16px]">⚡ <strong>Mais de 5.000 tratamentos realizados</strong> com tecnologia exclusiva</li>
                  <li className="text-white drop-shadow-sm text-[16px]">📈 <strong>Crescimento de 880% em 2024</strong></li>
                  <li className="text-white drop-shadow-sm text-[16px]">🏆 <strong>Premiação no SBPQO</strong> — melhor artigo científico sobre implantes com laser</li>
                  <li className="text-white drop-shadow-sm text-[16px]">🎓 <strong>Parcerias científicas</strong> com USP, UNESP, UNINOVE, São Leopoldo Mandic</li>
                </ul>

                <p className="text-white drop-shadow-sm text-[16px]">
                  Cada transformação real provava: a visão não estava errada — apenas prematura.
                </p>
              </section>

              {/* Seção 5 */}
              <section className="space-y-6">
                <h2 className="text-white drop-shadow-md text-[24px] font-bold">
                  🚀 A TECNOLOGIA QUE REVOLUCIONA: LASER FOTONA LIGHTWALKER
                </h2>

                <h3 className="text-white drop-shadow-md text-[20px]">
                  O sistema de laser odontológico mais avançado do mundo
                </h3>

                <p className="text-white drop-shadow-sm text-[16px]">
                  Produzido na Eslovênia, o Fotona LightWalker é líder global em tecnologia médica e já transformou dermatologia e ginecologia. Agora está transformando a odontologia.
                </p>

                <h3 className="text-white drop-shadow-md text-[20px]">
                  Por que é diferente?
                </h3>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white/5 p-6 rounded border border-white/20 space-y-3">
                    <p className="text-white drop-shadow-sm text-[16px]"><strong>Odontologia Convencional:</strong></p>
                    <ul className="space-y-2">
                      <li className="text-white drop-shadow-sm text-[16px]">❌ Brocas mecânicas que vibram e causam micro fraturas</li>
                      <li className="text-white drop-shadow-sm text-[16px]">❌ Sangramento, recuperação lenta</li>
                      <li className="text-white drop-shadow-sm text-[16px]">❌ Anestesia frequente, trauma físico</li>
                    </ul>
                  </div>

                  <div className="bg-white/5 p-6 rounded border border-[#35BFAD]/50 space-y-3">
                    <p className="text-white drop-shadow-sm text-[16px]"><strong>Odontologia com Laser Fotona:</strong></p>
                    <ul className="space-y-2">
                      <li className="text-white drop-shadow-sm text-[16px]">✅ <strong>Precisão micrométrica</strong> — minimamente invasivo</li>
                      <li className="text-white drop-shadow-sm text-[16px]">✅ <strong>Praticamente indolor</strong> — muitos tratamentos sem anestesia</li>
                      <li className="text-white drop-shadow-sm text-[16px]">✅ <strong>Sem sangramento</strong> — cicatrização acelerada</li>
                      <li className="text-white drop-shadow-sm text-[16px]">✅ <strong>Bioestimulação celular</strong> — regeneração natural</li>
                      <li className="text-white drop-shadow-sm text-[16px]">✅ <strong>Esterilização</strong> — elimina bactérias durante procedimento</li>
                    </ul>
                  </div>
                </div>

                <p className="text-white drop-shadow-sm text-[16px]">
                  <strong>E a ciência comprova.</strong> A Fotona reconhece oficialmente a Beauty Smile como <strong>case de sucesso e modelo de aplicação da tecnologia</strong>.
                </p>
              </section>

              {/* Seção 6 - Por Que Existimos */}
              <section className="space-y-6">
                <h2 className="text-white drop-shadow-md text-[24px] font-bold">
                  🎯 POR QUE EXISTIMOS
                </h2>

                <div className="bg-[#35BFAD]/20 p-8 rounded-lg border border-[#35BFAD]/50 space-y-4">
                  <h3 className="text-white drop-shadow-md text-[20px] font-bold">NOSSA VISÃO — A Estrela Polar</h3>
                  <div className="bg-white/10 border-l-4 border-white p-6 rounded">
                    <p className="text-white drop-shadow-sm text-[16px] italic">
                      "Transformar a odontologia global, promovendo tratamentos sem dor, sem trauma e com tecnologia de ponta, elevando a qualidade de vida dos pacientes."
                    </p>
                  </div>
                  <p className="text-white drop-shadow-sm text-[16px]">
                    Quando dissemos "odontologia global", não foi retórica. <strong>Foi ambição real.</strong> Os fundadores não têm limites. Fernando Jr. já revolucionou a odontologia brasileira uma vez com implantes. Agora está fazendo de novo com laser.
                  </p>
                  <p className="text-white drop-shadow-sm text-[16px]">
                    <strong>Nossa visão não é sobre ter uma clínica de sucesso ou ganhar dinheiro.</strong>
                  </p>
                  <p className="text-white drop-shadow-sm text-[16px]">
                    É sobre <strong>provar que existe um jeito melhor.</strong>
                  </p>
                  <p className="text-white drop-shadow-sm text-[16px]">
                    É sobre <strong>transformar a percepção global do que significa ir ao dentista.</strong>
                  </p>
                </div>

                <div className="bg-[#00109E]/30 p-8 rounded-lg border border-white/30 space-y-4">
                  <h3 className="text-white drop-shadow-md text-[20px] font-bold">NOSSA MISSÃO — O Farol</h3>
                  <div className="bg-white/10 border-l-4 border-white p-6 rounded">
                    <p className="text-white drop-shadow-sm text-[16px] italic">
                      "Proporcionar tratamentos odontológicos modernos e indolores, usando tecnologia de ponta e oferecendo uma experiência única e humanizada."
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <p className="text-white drop-shadow-sm text-[16px]">
                      <strong>Tratamentos modernos e indolores:</strong> Não é marketing. É compromisso técnico. Desenvolvemos protocolos próprios validados cientificamente.
                    </p>
                    <p className="text-white drop-shadow-sm text-[16px]">
                      <strong>Tecnologia de ponta:</strong> Dominamos a ciência por trás dos equipamentos. Participamos de congressos internacionais. Investimos em mestrados na Europa.
                    </p>
                    <p className="text-white drop-shadow-sm text-[16px]">
                      <strong>Experiência única e humanizada:</strong> <strong>Tratamos pessoas, não dentes.</strong> Escutamos medos, validamos traumas, construímos confiança. Cada detalhe é desenhado para fazer você se sentir seguro, acolhido e cuidado.
                    </p>
                  </div>
                </div>

                <div className="bg-white/10 p-8 rounded-lg border border-white/30 space-y-4">
                  <h3 className="text-white drop-shadow-md text-[20px] font-bold">NOSSO COMPROMISSO SOCIAL — Democratizando o Impossível</h3>
                  <p className="text-white drop-shadow-sm text-[16px]">
                    Nossa missão não termina nas paredes da clínica.
                  </p>
                  <p className="text-white drop-shadow-sm text-[16px]">
                    Paralelamente, mantemos <strong>projetos sociais</strong> onde levamos essa mesma tecnologia para quem não pode pagar:
                  </p>
                  <ul className="space-y-2">
                    <li className="text-white drop-shadow-sm text-[16px]">✅ <strong>Mais de 1.400 pessoas atendidas gratuitamente</strong> no Morro do Alemão (Instituto Alok) e Vila Olímpica do Salgueiro</li>
                    <li className="text-white drop-shadow-sm text-[16px]">✅ <strong>Parceria com a Prefeitura de São Paulo</strong> para atendimento de mulheres e crianças</li>
                  </ul>
                  <p className="text-white drop-shadow-sm text-[16px]"><strong>Por quê?</strong></p>
                  <p className="text-white drop-shadow-sm text-[16px]">
                    Porque transformar a odontologia global significa <strong>democratizar o acesso</strong>.
                  </p>
                  <div className="bg-white/10 border-l-4 border-[#35BFAD] p-6 rounded">
                    <p className="text-white drop-shadow-sm text-[16px] italic">
                      "Todo ser humano merece odontologia sem dor e sem trauma — independentemente da condição financeira."
                    </p>
                  </div>
                </div>
              </section>

              {/* Seção 7 - Valores */}
              <section className="space-y-6">
                <h2 className="text-white drop-shadow-md text-[24px] font-bold">
                  💎 NOSSOS 4 VALORES INEGOCIÁVEIS
                </h2>

                <p className="text-white drop-shadow-sm text-[16px]">
                  Os Valores são <strong>o coração que protege a empresa</strong>. Estão acima de qualquer pessoa.
                </p>

                <div className="bg-white/10 p-6 rounded-lg border border-white/30">
                  <p className="text-white drop-shadow-sm text-[16px] text-center">
                    <strong>Se você não vive nossos valores, você não pertence aqui. É simples assim.</strong>
                  </p>
                </div>

                {/* Valor 1 */}
                <div className="bg-white/5 p-8 rounded-lg border border-white/20 space-y-4">
                  <h3 className="text-white drop-shadow-md text-[20px] font-bold">⭐ VALOR 1: EXPERIÊNCIA UAU</h3>
                  <div className="bg-white/10 border-l-4 border-[#35BFAD] p-6 rounded">
                    <p className="text-white drop-shadow-sm text-[16px] italic">
                      "Criamos momentos inesquecíveis que superam as expectativas dos nossos pacientes."
                    </p>
                  </div>
                  <p className="text-white drop-shadow-sm text-[16px]">
                    Não é apenas fazer um bom atendimento — é fazer um atendimento que o paciente <strong>conta para os amigos, posta nas redes sociais, recomenda para a família</strong>.
                  </p>
                  <p className="text-white drop-shadow-sm text-[16px]"><strong>Como vivemos:</strong></p>
                  <ul className="space-y-2">
                    <li className="text-white drop-shadow-sm text-[16px]">• Personalizamos cada atendimento</li>
                    <li className="text-white drop-shadow-sm text-[16px]">• Cuidamos de cada detalhe — do Instagram ao pós-tratamento</li>
                    <li className="text-white drop-shadow-sm text-[16px]">• Surpreendemos com gestos genuínos</li>
                    <li className="text-white drop-shadow-sm text-[16px]">• Escutamos mais do que falamos</li>
                    <li className="text-white drop-shadow-sm text-[16px]">• Resolvemos problemas proativamente</li>
                  </ul>
                  <div className="bg-white/10 p-4 rounded">
                    <p className="text-white drop-shadow-sm text-[16px]">
                      <strong>Exemplo real:</strong> Dona Luzia chegou desesperada. O dentista <strong>escutou por 40 minutos</strong> toda sua jornada, validou cada medo, explicou pacientemente. Resultado: ela confiou, e hoje é case de sucesso que inspira outros.
                    </p>
                  </div>
                </div>

                {/* Valor 2 */}
                <div className="bg-white/5 p-8 rounded-lg border border-white/20 space-y-4">
                  <h3 className="text-white drop-shadow-md text-[20px] font-bold">🚀 VALOR 2: INOVAÇÃO</h3>
                  <div className="bg-white/10 border-l-4 border-[#35BFAD] p-6 rounded">
                    <p className="text-white drop-shadow-sm text-[16px] italic">
                      "Transformamos vidas através da tecnologia de ponta, trazendo o futuro para o presente da odontologia."
                    </p>
                  </div>
                  <p className="text-white drop-shadow-sm text-[16px]">
                    Inovação não é apenas ter equipamento moderno. É ter <strong>mentalidade de melhoria contínua</strong>. É ser inconformado com o status quo. É perguntar "como podemos fazer melhor?" mesmo quando funciona bem.
                  </p>
                  <p className="text-white drop-shadow-sm text-[16px]"><strong>Como vivemos:</strong></p>
                  <ul className="space-y-2">
                    <li className="text-white drop-shadow-sm text-[16px]">• Buscamos constantemente novas técnicas</li>
                    <li className="text-white drop-shadow-sm text-[16px]">• Desenvolvemos protocolos próprios baseados em evidências</li>
                    <li className="text-white drop-shadow-sm text-[16px]">• Investimos em IA e automações</li>
                    <li className="text-white drop-shadow-sm text-[16px]">• Testamos, ajustamos, escalamos</li>
                  </ul>
                  <div className="bg-white/10 p-4 rounded">
                    <p className="text-white drop-shadow-sm text-[16px]">
                      <strong>Exemplo real:</strong> Desenvolvemos protocolo proprietário de clareamento que <strong>reduz sensibilidade em 90%</strong> mantendo mesma eficácia. Hoje é nosso diferencial clínico.
                    </p>
                  </div>
                </div>

                {/* Valor 3 */}
                <div className="bg-white/5 p-8 rounded-lg border border-white/20 space-y-4">
                  <h3 className="text-white drop-shadow-md text-[20px] not-italic font-bold">💪 VALOR 3: ATITUDE DE DONO</h3>
                  <div className="bg-white/10 border-l-4 border-[#35BFAD] p-6 rounded">
                    <p className="text-white drop-shadow-sm text-[16px] italic">
                      "Assumimos responsabilidade total por cada resultado e experiência entregue na clínica."
                    </p>
                  </div>
                  <p className="text-white drop-shadow-sm text-[16px]">
                    Tratar esta clínica como se fosse sua. Cuidar da reputação como se fosse pessoal. Resolver problemas sem esperar ordens. Assumir resultados — bons e ruins — como seus.
                  </p>
                  <p className="text-white drop-shadow-sm text-[16px]"><strong>Como vivemos:</strong></p>
                  <ul className="space-y-2">
                    <li className="text-white drop-shadow-sm text-[16px]">• Tratamos cada paciente como se a clínica fosse nossa</li>
                    <li className="text-white drop-shadow-sm text-[16px]">• Somos proativos na resolução de problemas</li>
                    <li className="text-white drop-shadow-sm text-[16px]">• Assumimos erros abertamente</li>
                    <li className="text-white drop-shadow-sm text-[16px]">• Pensamos no impacto de longo prazo</li>
                  </ul>
                  <div className="bg-white/10 p-4 rounded space-y-3">
                    <p className="text-white drop-shadow-sm text-[16px]">
                      <strong>Teste rápido:</strong> Você vê uma cadeira fora do lugar na sala de espera. O que faz?
                    </p>
                    <ul className="space-y-2">
                      <li className="text-white drop-shadow-sm text-[16px]">❌ Ignora porque "não é sua função"</li>
                      <li className="text-white drop-shadow-sm text-[16px]">✅ <strong>Arruma imediatamente porque o próximo paciente merece encontrar tudo perfeito</strong></li>
                    </ul>
                    <p className="text-white drop-shadow-sm text-[16px]">
                      Esse é o espírito. Pequenas ações. Grandes impactos.
                    </p>
                  </div>
                </div>

                {/* Valor 4 */}
                <div className="bg-white/5 p-8 rounded-lg border border-white/20 space-y-4">
                  <h3 className="text-white drop-shadow-md text-[20px] font-bold">📈 VALOR 4: SEDE DE CRESCIMENTO</h3>
                  <div className="bg-white/10 border-l-4 border-[#35BFAD] p-6 rounded">
                    <p className="text-white drop-shadow-sm text-[16px] italic">
                      "Sempre acreditamos que há algo novo para aprender e melhorar."
                    </p>
                  </div>
                  <p className="text-white drop-shadow-sm text-[16px]">
                    Ter fome de evolução constante. Nunca estar satisfeito com "bom o suficiente". Entender que <strong>estagnação é retrocesso</strong>.
                  </p>
                  <p className="text-white drop-shadow-sm text-[16px]"><strong>Como vivemos:</strong></p>
                  <ul className="space-y-2">
                    <li className="text-white drop-shadow-sm text-[16px]">• Buscamos ativamente aprendizado</li>
                    <li className="text-white drop-shadow-sm text-[16px]">• Pedimos feedback regularmente</li>
                    <li className="text-white drop-shadow-sm text-[16px]">• Celebramos erros como aprendizado</li>
                    <li className="text-white drop-shadow-sm text-[16px]">• Compartilhamos conhecimento</li>
                    <li className="text-white drop-shadow-sm text-[16px]">• Aceitamos desafios fora da zona de conforto</li>
                  </ul>
                  <div className="bg-white/10 p-4 rounded">
                    <p className="text-white drop-shadow-sm text-[16px]">
                      <strong>Exemplo real:</strong> Um membro do time comercial percebeu conversões abaixo da média. Ao invés de culpar, <strong>pediu feedback, estudou, treinou</strong>. Três meses depois, era top performer. <strong>Crescimento é escolha, não sorte.</strong>
                    </p>
                  </div>
                </div>
              </section>

              {/* Seção 8 - Princípios */}
              <section className="space-y-6">
                <h2 className="text-white drop-shadow-md text-[24px] font-bold">
                  🛡️ PRINCÍPIOS INEGOCIÁVEIS
                </h2>

                <p className="text-white drop-shadow-sm text-[16px]">
                  Além dos nossos 4 valores, há princípios que são <strong>linhas vermelhas absolutas</strong>:
                </p>

                <div className="bg-white/5 p-8 rounded-lg border border-white/20 space-y-4">
                  <h3 className="text-white drop-shadow-md text-[20px] font-bold">HONESTIDADE</h3>
                  <div className="bg-white/10 border-l-4 border-[#35BFAD] p-6 rounded">
                    <p className="text-white drop-shadow-sm text-[16px] italic">
                      "Diga a verdade, como você a percebe — sem omitir, distorcer ou exagerar."
                    </p>
                  </div>
                  <p className="text-white drop-shadow-sm text-[16px]">
                    Transparência é olhar no olho do paciente e explicar sua real situação. É dizer que o tratamento levará tempo, mas funcionará. É explicar que alguns hábitos precisarão mudar. A tecnologia impressiona, mas é a verdade que fideliza.
                  </p>
                  <p className="text-white drop-shadow-sm text-[16px]">
                    <strong>Não toleramos:</strong>
                  </p>
                  <ul className="space-y-2">
                    <li className="text-white drop-shadow-sm text-[16px]">• Prometer o que não pode entregar</li>
                    <li className="text-white drop-shadow-sm text-[16px]">• Omitir informações relevantes</li>
                    <li className="text-white drop-shadow-sm text-[16px]">• Exagerar resultados</li>
                    <li className="text-white drop-shadow-sm text-[16px]">• Esconder erros</li>
                  </ul>
                </div>

                <div className="bg-white/5 p-8 rounded-lg border border-white/20 space-y-4">
                  <h3 className="text-white drop-shadow-md text-[20px] font-bold">INTEGRIDADE</h3>
                  <div className="bg-white/10 border-l-4 border-[#35BFAD] p-6 rounded">
                    <p className="text-white drop-shadow-sm text-[16px] italic">
                      "Fazer o que é certo, mesmo quando ninguém está olhando."
                    </p>
                  </div>
                  <p className="text-white drop-shadow-sm text-[16px]">
                    Integridade é recomendar o tratamento que o paciente <strong>precisa</strong>, não o que dá mais lucro. É assumir o erro antes que ele vire problema. É cuidar da clínica como se seu nome estivesse na porta.
                  </p>
                  <p className="text-white drop-shadow-sm text-[16px]">
                    <strong>Não toleramos:</strong>
                  </p>
                  <ul className="space-y-2">
                    <li className="text-white drop-shadow-sm text-[16px]">• Negligência que prejudica pacientes</li>
                    <li className="text-white drop-shadow-sm text-[16px]">• Desonestidade sobre competências</li>
                    <li className="text-white drop-shadow-sm text-[16px]">• Descumprimento repetido de compromissos</li>
                  </ul>
                </div>

                <div className="bg-red-900/30 p-6 rounded-lg border-2 border-red-500/50">
                  <p className="text-white drop-shadow-sm text-[16px] text-center">
                    <strong>Uma violação de honestidade ou integridade = desligamento imediato. Sem discussão.</strong>
                  </p>
                </div>
              </section>

              {/* Seção 9 - Futuro */}
              <section className="space-y-6">
                <h2 className="text-white drop-shadow-md text-[24px] font-bold">
                  🌍 PARA ONDE VAMOS: O FUTURO QUE CONSTRUÍMOS
                </h2>

                <p className="text-white drop-shadow-sm text-[16px]">
                  A <strong>Invisalign</strong> provou que é possível. Eles transformaram a ortodontia. Hoje, crianças crescem sem saber que aparelhos metálicos já foram o padrão.
                </p>

                <p className="text-white drop-shadow-sm text-[16px]">
                  <strong>A Beauty Smile está fazendo exatamente isso com a odontologia a laser.</strong>
                </p>

                <p className="text-white drop-shadow-sm text-[16px]">
                  Nosso sonho não é ter a maior rede de clínicas. É transformar a percepção do que significa ir ao dentista. É fazer com que, <strong>daqui a 10 anos</strong>, a primeira pergunta seja:
                </p>

                <div className="bg-white/10 border-l-4 border-[#35BFAD] p-6 rounded">
                  <p className="text-white drop-shadow-sm text-[16px] italic">
                    "Vai ser com laser Fotona ou com método convencional?"
                  </p>
                </div>

                <p className="text-white drop-shadow-sm text-[16px]">
                  E que escolher o convencional pareça tão ultrapassado quanto usar máquina de escrever.
                </p>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white/5 p-6 rounded-lg border border-white/20 space-y-3">
                    <h3 className="text-white drop-shadow-md text-[20px]">Em 5 anos:</h3>
                    <ul className="space-y-2">
                      <li className="text-white drop-shadow-sm text-[16px]">✅ Beauty Smile será <strong>a referência em laser na odontologia brasileira</strong></li>
                      <li className="text-white drop-shadow-sm text-[16px]">✅ <strong>33 a 35 unidades</strong> democratizando acesso</li>
                      <li className="text-white drop-shadow-sm text-[16px]">✅ <strong>Academia Beauty Smile</strong> formando dentistas de todo o país</li>
                      <li className="text-white drop-shadow-sm text-[16px]">✅ <strong>5.000 pessoas atendidas gratuitamente</strong></li>
                    </ul>
                  </div>

                  <div className="bg-white/5 p-6 rounded-lg border border-white/20 space-y-3">
                    <h3 className="text-white drop-shadow-md text-[20px]">Em 10 anos:</h3>
                    <ul className="space-y-2">
                      <li className="text-white drop-shadow-sm text-[16px]">✅ <strong>10 a 20 unidades completas</strong> + primeiras unidades internacionais</li>
                      <li className="text-white drop-shadow-sm text-[16px]">✅ <strong>70 a 100 unidades em parceria</strong> capilarizando o Brasil</li>
                      <li className="text-white drop-shadow-sm text-[16px]">✅ <strong>1.000 dentistas certificados</strong></li>
                      <li className="text-white drop-shadow-sm text-[16px]">✅ <strong>50.000 pessoas impactadas</strong> nos projetos sociais</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-[#35BFAD]/20 p-8 rounded-lg border border-[#35BFAD]/50 space-y-3">
                  <h3 className="text-white drop-shadow-md text-[20px]">O legado irreversível:</h3>
                  <p className="text-white drop-shadow-sm text-[16px]">
                    Uma geração de crianças crescendo <strong>sem trauma de dentista</strong>.
                  </p>
                  <p className="text-white drop-shadow-sm text-[16px]">
                    <strong>Esse é o impacto geracional. Não melhorar o presente — transformar o futuro.</strong>
                  </p>
                </div>
              </section>

              {/* Seção 10 - Você */}
              <section className="space-y-6">
                <h2 className="text-white drop-shadow-md text-[24px] font-bold">
                  🦸 VOCÊ: NOSSO PRÓXIMO CRUZADO
                </h2>

                <p className="text-white drop-shadow-sm text-[16px]">
                  A Beauty Smile não tem funcionários. Tem <strong>cruzados</strong>.
                </p>

                <p className="text-white drop-shadow-sm text-[16px]">
                  Pessoas que não aceitaram trabalhar aqui apenas por um salário. Aceitaram porque <strong>compraram a missão de acabar com o trauma odontológico</strong>.
                </p>

                <div className="bg-white/10 p-8 rounded-lg border border-white/30 space-y-4">
                  <h3 className="text-white drop-shadow-md text-[20px] font-bold">🎯 O QUE PROCURAMOS:</h3>
                  <p className="text-white drop-shadow-sm text-[16px]">
                    <strong>Você não precisa ser revolucionário.</strong>
                  </p>
                  <p className="text-white drop-shadow-sm text-[16px]">
                    Você precisa fazer bem feito o que se compromete a fazer e se orgulhar do resultado. Você precisa levar seu trabalho a sério e se importar genuinamente com o impacto que ele tem na vida das pessoas.
                  </p>
                  <p className="text-white drop-shadow-sm text-[16px]">
                    <strong>Mas se você compra genuinamente a missão de transformar a odontologia...</strong>
                  </p>
                  <p className="text-white drop-shadow-sm text-[16px]">
                    Se você não aceita "sempre foi assim" como resposta final...
                  </p>
                  <p className="text-white drop-shadow-sm text-[16px]">
                    Se você vê na tecnologia laser não apenas um equipamento, mas uma forma de transformar vidas...
                  </p>
                  <p className="text-white drop-shadow-sm text-[16px]">
                    <strong>Então você não é apenas um profissional. Você é um cruzado.</strong>
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white/5 p-6 rounded-lg border border-[#35BFAD]/50 space-y-4">
                    <h3 className="text-white drop-shadow-md text-[20px] font-bold">🤝 O QUE PROMETEMOS A VOCÊ:</h3>
                    <p className="text-white drop-shadow-sm text-[16px]">
                      Se você vive nossos valores e se compromete com o propósito, nós prometemos:
                    </p>
                    <ul className="space-y-2">
                      <li className="text-white drop-shadow-sm text-[16px]">✅ <strong>Ambiente de crescimento real</strong> — investimento concreto no seu desenvolvimento</li>
                      <li className="text-white drop-shadow-sm text-[16px]">✅ <strong>Autonomia genuína</strong> — confiança para agir, errar, aprender, crescer</li>
                      <li className="text-white drop-shadow-sm text-[16px]">✅ <strong>Transparência sobre desafios e sucessos</strong></li>
                      <li className="text-white drop-shadow-sm text-[16px]">✅ <strong>Feedback honesto e construtivo</strong></li>
                      <li className="text-white drop-shadow-sm text-[16px]">✅ <strong>Reconhecimento por resultados</strong></li>
                      <li className="text-white drop-shadow-sm text-[16px]">✅ <strong>Propósito maior que salário</strong> — você vai para casa sabendo que transformou vidas</li>
                    </ul>
                  </div>

                  <div className="bg-white/5 p-6 rounded-lg border border-white/30 space-y-4">
                    <h3 className="text-white drop-shadow-md text-[20px] font-bold">💪 O QUE ESPERAMOS DE VOCÊ:</h3>
                    <ul className="space-y-2">
                      <li className="text-white drop-shadow-sm text-[16px]">✅ <strong>Viver os valores diariamente</strong> — não apenas quando alguém está olhando</li>
                      <li className="text-white drop-shadow-sm text-[16px]">✅ <strong>Assumir responsabilidade total</strong> — pela sua área, pelos resultados, pela reputação</li>
                      <li className="text-white drop-shadow-sm text-[16px]">✅ <strong>Comunicar proativamente</strong> — problemas, ideias, feedback, necessidades</li>
                      <li className="text-white drop-shadow-sm text-[16px]">✅ <strong>Crescer constantemente</strong> — buscar evolução, não acomodação</li>
                      <li className="text-white drop-shadow-sm text-[16px]">✅ <strong>Cuidar do time</strong> — seu sucesso está conectado ao sucesso coletivo</li>
                      <li className="text-white drop-shadow-sm text-[16px]">✅ <strong>Representar a marca com orgulho</strong> — dentro e fora da clínica</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-red-900/20 p-6 rounded-lg border border-red-500/30 space-y-3">
                  <h3 className="text-white drop-shadow-md text-[20px] font-bold">⚠️ O QUE NÃO TOLERAMOS:</h3>
                  <ul className="space-y-2">
                    <li className="text-white drop-shadow-sm text-[16px]">❌ <strong>Falta de ética e integridade</strong> — mentir, recomendar desnecessário, esconder erros</li>
                    <li className="text-white drop-shadow-sm text-[16px]">❌ <strong>Falta de comprometimento com o propósito</strong> — estar aqui só pelo salário</li>
                    <li className="text-white drop-shadow-sm text-[16px]">❌ <strong>Comportamento tóxico</strong> — assédio, bullying, fofoca destrutiva</li>
                    <li className="text-white drop-shadow-sm text-[16px]">❌ <strong>Falta de relacionamento genuíno</strong> — não se importar com colegas e pacientes</li>
                    <li className="text-white drop-shadow-sm text-[16px]">❌ <strong>Não vestir a camisa</strong> — falar mal da empresa, fazer corpo mole</li>
                  </ul>
                </div>
              </section>

              {/* Seção Final */}
              <section className="space-y-6">
                <h2 className="text-white drop-shadow-md text-[24px] font-bold">
                  🎯 PRONTO(A) PARA SE JUNTAR AO TIME DOS SONHOS?
                </h2>

                <p className="text-white drop-shadow-sm text-[16px]">
                  Se você leu até aqui e sentiu que <strong>este é o lugar onde você deveria estar</strong>...
                </p>

                <p className="text-white drop-shadow-sm text-[16px]">
                  Se você se vê transformando vidas, não apenas cumprindo tarefas...
                </p>

                <p className="text-white drop-shadow-sm text-[16px]">
                  <strong>Então vamos começar.</strong>
                </p>

                <p className="text-white drop-shadow-sm text-[16px]">
                  Responda com honestidade, autenticidade e profundidade. Não há respostas "certas" ou "erradas" — há respostas que mostram quem você realmente é.
                </p>

                <p className="text-white drop-shadow-sm text-[16px]">
                  E se quem você �� se alinha com quem somos, <strong>vamos construir algo extraordinário juntos.</strong>
                </p>

                <div className="border-t border-white/20" />

                <p className="text-white drop-shadow-sm text-[16px] italic text-center">
                  Aqui, cada sorriso é a prova de que, quando tradição e tecnologia se unem, é possível transformar vidas — hoje e sempre. ✨
                </p>

                <div className="border-t border-white/20" />

                <div className="text-center space-y-4">
                  <p className="text-white drop-shadow-sm text-[16px]">
                    <strong>👉 Agora, clique em iniciar e comece a responder as perguntas.</strong>
                  </p>

                  <p className="text-white drop-shadow-sm text-[16px]">
                    <strong>Vamos conhecer você! 🚀</strong>
                  </p>
                </div>
              </section>

            </div>
          </GlassCard>

          {/* Botão de Continuar */}
          <div className="flex justify-center mt-8">
            <button
              onClick={() => {
                window.location.href = '#questionario-cultura';
                // Em produção, use o router apropriado
              }}
              className="group px-10 py-5 rounded-lg border-2 backdrop-blur-md transition-all duration-300 bg-[#00109E] hover:bg-[#00109E]/90 text-white border-white/50 shadow-2xl hover:shadow-[0_0_30px_rgba(0,16,158,0.5)] hover:border-white/70 active:scale-95 cursor-pointer flex items-center gap-3"
            >
              <span className="drop-shadow-md text-[16px]">Entendi, Continuar</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </button>
          </div>
        </div>
      </div>
    </BackgroundImage>
  );
}
