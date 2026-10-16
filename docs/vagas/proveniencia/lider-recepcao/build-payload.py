#!/usr/bin/env python3
"""Payload da vaga de líder de recepção. Fonte: o descritivo antigo de Recepcionista e o formulário
antigo que o operador colou (2026-10-16), e as decisões dele na rodada de perguntas (começa sozinha e
monta a equipe; fidelização sem vender; 2+ anos de recepção eliminatório; redação C1). `sobre_empresa`,
a seção de links e o endereço são EXTRAÍDOS do payload da vaga de SDR (mesmo texto institucional),
nunca transcritos.
    python3 -I build-payload.py <repo> <saida.json>"""
import json, sys, os
repo, saida = sys.argv[1:3]
sdr = json.load(open(os.path.join(repo, 'docs/vagas/proveniencia/sdr-relacionamento-pre-vendas.payload.json')))

sobre_cargo = """Na Beauty Smile, o tratamento é feito 100% com o laser Fotona LightWalker — uma odontologia sem dor, sem trauma e minimamente invasiva. Muitos dos nossos pacientes chegam com medo de dentista, e a primeira e a última impressão da clínica acontecem na recepção.

Buscamos alguém que já seja referência em recepção para **responder pela recepção**: cuidar de cada paciente da chegada à saída, organizar a agenda e o padrão de atendimento, e formar a equipe que vem.

**A equipe.** Você começa como a pessoa da recepção. Conforme a clínica cresce, é você quem treina e lidera as próximas recepcionistas.

**O que esta vaga não é.** Não é vaga de vendas. Você cuida do relacionamento e do retorno dos pacientes; orçamento e valores ficam com o Dr. Fernando e a equipe de pré-vendas.

### O que acompanhamos com você

- Confirmação das consultas e faltas na agenda.
- Tempo de resposta no WhatsApp da clínica.
- Satisfação dos pacientes e reclamações resolvidas.
- Retorno e manutenção dos pacientes em tratamento.

### Onde e em que horário

Presencial, na clínica: Rua Desembargador Eliseu Guilherme, 53 — Paraíso, São Paulo/SP, a poucos minutos dos metrôs Paraíso e Brigadeiro.

Segunda a sexta, das 9h às 19h, com 1h12 de intervalo — 44h semanais, em regime CLT, com compensação do sábado por acordo escrito.

### Como é o processo seletivo

Inscrição com perguntas objetivas e análise do currículo. Quem avança recebe uma avaliação online, para fazer no seu tempo: seis situações do dia a dia da recepção, um caso escrito e uma redação curta. Depois, entrevista."""

responsabilidades = """- **Atendimento.** Receber os pacientes pelo nome, com calma e cuidado — inclusive quem chega com medo — e atender telefone, WhatsApp e e-mail com agilidade.
- **Agenda.** Marcar, confirmar e encaixar consultas, trabalhar para reduzir faltas e avisar o paciente com antecedência quando houver atraso.
- **Documentos e LGPD.** Cuidar do cadastro, dos termos e dos exames dos pacientes, com o arquivamento correto e a proteção de dados que a LGPD exige.
- **Administrativo.** Receber pagamentos, fechar o caixa do dia, controlar o estoque de materiais da recepção e apoiar a equipe em demandas administrativas.
- **Relacionamento.** Acompanhar o retorno dos pacientes em tratamento, coletar a opinião deles, resolver reclamações até o fim e promover o programa de indicação. Interesse em novo procedimento vai para a avaliação, nunca para uma conversa de preço na recepção.
- **Processo e equipe.** Manter os checklists e o padrão de atendimento da recepção, propor melhorias e treinar quem chegar para trabalhar com você."""

requisitos_formacao = "Ensino médio completo."

requisitos_experiencia = """**Pelo menos 2 anos em recepção ou atendimento ao cliente.**

**Contam pontos:** recepção de clínica odontológica ou da área da saúde; ter treinado colegas, montado escala ou respondido pela recepção na ausência da liderança."""

requisitos_tecnicos = """Sistema de agendamento (qualquer um); WhatsApp Business; planilhas, como Excel ou Google Planilhas; cuidado com dados de pacientes (LGPD).

**Contam pontos:** Clinicorp; recebimento de pagamentos e fechamento de caixa; controle de estoque. Se você nunca usou o Clinicorp, a clínica treina."""

requisitos_habilidades = """- **Responsável pelo processo** — segue o que está combinado e, quando algo não funciona, propõe a mudança e testa.
- **Comunicação** — escreve e fala com clareza, com o paciente e com a equipe.
- **Calma sob pressão** — agenda cheia, paciente irritado e telefone tocando ao mesmo tempo.
- **Organização** — prioriza o que importa e não deixa nada se perder entre um turno e outro.
- **Discrição** — trata os dados e a história de cada paciente com sigilo."""

diferenciais = """- Experiência em recepção de clínica odontológica ou da área da saúde.
- Experiência com o Clinicorp ou outro sistema de agenda de clínica.
- Experiência com gestão de documentos e LGPD.
- Experiência treinando colegas ou organizando a rotina de uma equipe de atendimento."""

beneficios = """Contrato CLT, com salário fixo. Os valores são apresentados na entrevista.

- Vale-transporte e plano de saúde.
- Wellhub.
- Tratamentos Beauty Smile e desconto em procedimentos para familiares, conforme política interna.
- Cursos e treinamentos internos.

*Benefícios válidos após o período de experiência (3 meses).*"""

perfil_ideal = ("Profissional de recepção experiente que já responde pelo processo e começa a liderar: cuida do paciente "
    "da confirmação à saída, chama pelo nome, avisa atraso antes de o paciente perguntar e trata o paciente "
    "com medo sem pressa. Mantém agenda, confirmação e checklist funcionando e muda o que não funciona. "
    "Não vende: leva interesse em procedimento para a avaliação. Na entrevista, sondar: uma melhoria "
    "que a pessoa fez na recepção e como mediu; um erro de agenda que foi dela e o que mudou depois; como "
    "trataria uma colega que atende com frieza; como lidou com um paciente irritado na frente de "
    "outros. Riscos: quem culpa o sistema ou o paciente, quem passa preço na recepção e quem leva "
    "problema de colega à coordenação sem falar com a colega.")

DISP = ['Tenho disponibilidade integral e presencial, de segunda a sexta, no horário da clínica',
        'Tenho disponibilidade integral e presencial, mas precisaria ajustar o horário de entrada ou de saída',
        'Tenho disponibilidade apenas parcial, em alguns dias da semana',
        'Tenho disponibilidade apenas para trabalho remoto']
perguntas = [
    dict(bloco='jornada', ordem=1, texto_ajuda=None, tipo_resposta='single_choice', obrigatoria=True, limite_caracteres=None,
         texto_pergunta='Qual é a sua disponibilidade para esta vaga, que é presencial na clínica, no Paraíso, em São Paulo, de segunda a sexta, das 9h às 19h?',
         opcoes_resposta=DISP, knockout_proposto=[DISP[3]]),
    dict(bloco='curriculo', ordem=2, texto_ajuda=None, tipo_resposta='single_choice', obrigatoria=True, limite_caracteres=None,
         texto_pergunta='Há quanto tempo, somando todos os empregos, você trabalha com recepção ou atendimento ao cliente?',
         opcoes_resposta=['Menos de 1 ano em recepção ou atendimento ao cliente',
                          'Entre 1 e 2 anos em recepção ou atendimento ao cliente',
                          'Entre 2 e 5 anos em recepção ou atendimento ao cliente',
                          'Mais de 5 anos em recepção ou atendimento ao cliente']),
    dict(bloco='curriculo', ordem=3, texto_ajuda=None, tipo_resposta='single_choice', obrigatoria=True, limite_caracteres=None,
         texto_pergunta='Onde foi a sua experiência mais longa em recepção?',
         opcoes_resposta=['Recepção em clínica odontológica',
                          'Recepção em outra clínica ou serviço de saúde (médica, estética, laboratório, hospital)',
                          'Recepção em hotelaria, eventos ou outro serviço de alto padrão',
                          'Recepção ou atendimento em varejo, call center ou outro tipo de empresa',
                          'Ainda não trabalhei em recepção']),
    dict(bloco='curriculo', ordem=4, texto_ajuda=None, tipo_resposta='multiple_choice', obrigatoria=True, limite_caracteres=None,
         texto_pergunta='Além da sua própria função, que responsabilidade você já teve na recepção ou no atendimento?',
         opcoes_resposta=['Liderei formalmente uma equipe de recepção ou de atendimento',
                          'Sem ter o cargo, treinei colegas novos, montei escala ou respondi pela recepção na ausência da liderança',
                          'Criei ou mudei processos, checklists ou controles da recepção',
                          'Ainda não tive responsabilidade além da minha própria função']),
    dict(bloco='curriculo', ordem=5, texto_ajuda=None, tipo_resposta='multiple_choice', obrigatoria=True, limite_caracteres=None,
         texto_pergunta='Quais destas atividades já são rotina do seu trabalho, e não algo que você fez uma vez?',
         opcoes_resposta=['Recepção presencial de pacientes ou clientes',
                          'Atendimento por WhatsApp e telefone',
                          'Confirmação de consultas e trabalho ativo para reduzir faltas',
                          'Recebimento de pagamentos e fechamento de caixa',
                          'Controle de documentos, termos ou exames de pacientes, com cuidado de LGPD',
                          'Controle de estoque de materiais da recepção',
                          'Atendimento de reclamações até a resolução',
                          'Retorno, recall ou pesquisa de satisfação de pacientes',
                          'Acompanhamento de indicadores, como faltas, tempo de resposta ou satisfação',
                          'Nenhuma destas ainda é rotina do meu trabalho']),
    dict(bloco='tecnologia', ordem=6, texto_ajuda=None, tipo_resposta='multiple_choice', obrigatoria=True, limite_caracteres=None,
         texto_pergunta='Com quais sistemas de agendamento você já trabalhou?',
         opcoes_resposta=['Clinicorp', 'Doctoralia', 'Feegow', 'iClinic', 'Clínica nas Nuvens',
                          'Outro sistema de agenda de clínica, hospital ou laboratório (Tasy, MV, sistema próprio)',
                          'Só agenda em planilha, Google Agenda ou papel',
                          'Nunca trabalhei com agendamento']),
    dict(bloco='tecnologia', ordem=7, texto_ajuda=None, tipo_resposta='multiple_choice', obrigatoria=True, limite_caracteres=None,
         texto_pergunta='Quais destas ferramentas você usa no trabalho com segurança?',
         opcoes_resposta=['Planilhas (Excel ou Google Planilhas), com filtros e fórmulas simples',
                          'WhatsApp Business, com etiquetas e respostas rápidas',
                          'E-mail corporativo',
                          'ChatGPT ou outra IA, para escrever ou organizar o trabalho',
                          'Ferramentas de tarefas, como Trello, Notion ou ClickUp',
                          'Nenhuma destas ferramentas']),
    dict(bloco='valores', ordem=8, texto_ajuda=None, tipo_resposta='single_choice', obrigatoria=True, limite_caracteres=None,
         texto_pergunta='Em relação aos processos e checklists da recepção, qual frase mais se parece com você?',
         opcoes_resposta=['Sigo os processos à risca e, quando algo não funciona, proponho a mudança e testo',
                          'Sigo os processos à risca, sem exceções',
                          'Adapto conforme o dia, sem registrar o que mudei',
                          'Prefiro resolver na hora, pela minha experiência, a seguir checklist']),
    dict(bloco='valores', ordem=9, texto_ajuda='Opcional.', tipo_resposta='texto_curto', obrigatoria=False, limite_caracteres=500,
         texto_pergunta='O que você fez nos últimos seis meses para trabalhar melhor — um curso, uma leitura, uma mudança na sua rotina? Conte em poucas linhas.',
         opcoes_resposta=None),
]
for q in perguntas:
    ko = q.pop('knockout_proposto', None)
    if ko:
        q['opcoes_metadata'] = [dict(opcao_texto=t, tag=('knockout' if t in ko else 'neutro'), ordem=i + 1)
                                for i, t in enumerate(q['opcoes_resposta'])]

payload = {
    'autor_email': 'fernando@beautysmile.com.br',
    '_proveniencia': 'descritivo antigo de Recepcionista e formulario antigo colados pelo operador em 2026-10-16 + decisoes da rodada de perguntas; sobre_empresa e secao de links extraidos do payload da vaga de SDR',
    'vaga': dict(
        slug='lider-recepcao', titulo='Líder de Recepção',
        subtitulo='Recepção, agenda e experiência do paciente · CLT presencial · unidade Paraíso',
        descricao_curta='Para quem já é referência em recepção: cuidar da primeira e da última impressão do paciente, responder pela agenda e pelo padrão de atendimento e formar a equipe que vem. CLT, presencial no Paraíso, em São Paulo.',
        departamento='Atendimento', tipo_contrato='CLT', modelo_trabalho='Presencial', cidade='São Paulo', estado='SP',
        endereco_completo='Rua Desembargador Eliseu Guilherme, 53 — Paraíso, São Paulo/SP',
        jornada_trabalho='Presencial, segunda a sexta, das 9h às 19h com 1h12 de intervalo — 44h semanais, CLT, com compensação do sábado por acordo escrito.',
        faixa_salarial_min=3000, faixa_salarial_max=4000, exibir_salario=False, total_vagas=1, aplica_cognitivo=False,
        sobre_cargo=sobre_cargo, responsabilidades=responsabilidades, requisitos_formacao=requisitos_formacao,
        requisitos_experiencia=requisitos_experiencia, requisitos_tecnicos=requisitos_tecnicos,
        requisitos_habilidades=requisitos_habilidades, diferenciais=diferenciais, beneficios=beneficios,
        sobre_empresa=sdr['vaga']['sobre_empresa'], perfil_ideal=perfil_ideal),
    '_resolvidos_no_apply': {'data_abertura': 'data do apply, fuso America/Sao_Paulo', 'data_fechamento': None},
    'secoes_extras': [s for s in sdr['secoes_extras'] if s['titulo'] == 'Conheça a Beauty Smile'],
    'template_cargo': 'recepcionista',
    'pesos_avaliacao': {'triagem': 25, 'work_sample_sjt': 30, 'redacao_cultural': 20, 'entrevista': 25},
    'testes_aplicaveis': [
        {'teste': 'triagem', 'obrigatorio': True, 'customizado': False},
        {'teste': 'work_sample_sjt', 'obrigatorio': True, 'customizado': False, 'cargo': 'lider-recepcao'},
        {'teste': 'redacao_cultural', 'obrigatorio': True, 'customizado': False, 'codigos': ['C1']},
        {'teste': 'big_five', 'obrigatorio': False, 'customizado': False},
        {'teste': 'cognitivo', 'obrigatorio': False, 'customizado': False},
        {'teste': 'entrevista', 'obrigatorio': True, 'customizado': False}],
    'rubrica_ia': open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'rubrica.md'), encoding='utf-8').read().strip(),
    'perguntas': perguntas,
}
assert len(perfil_ideal) <= 800, len(perfil_ideal)
assert len(payload['secoes_extras']) == 1
json.dump(payload, open(saida, 'w'), ensure_ascii=False, indent=2)
print('ok', saida, 'perfil_ideal', len(perfil_ideal))
