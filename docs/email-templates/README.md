# Email Templates - Sistema de Recuperação de Senha

Templates de email personalizados para o sistema de recuperação de senha Beauty Smile.

## 📁 Arquivos Disponíveis

### Templates para Candidatos

1. **candidato-recuperacao-senha.html** - Template HTML com branding Beauty Smile
   - Gradiente azul característico
   - Layout responsivo
   - Branding focado em recrutamento

2. **candidato-recuperacao-senha.txt** - Versão texto simples (fallback)
   - Para clientes de email que não suportam HTML
   - Acessibilidade garantida

### Templates para Administradores

3. **admin-recuperacao-senha.html** - Template HTML com branding administrativo
   - Badge de segurança "Painel Administrativo"
   - Avisos de segurança destacados
   - Recomendações de senha forte
   - Visual mais corporativo

4. **admin-recuperacao-senha.txt** - Versão texto simples (fallback)
   - Mensagens de segurança em destaque
   - Formatação clara para texto simples

### Documentação

5. **SETUP_GUIDE.md** - Guia completo de configuração
   - Instruções passo a passo
   - Configuração no Supabase Dashboard
   - Testes e validação
   - Troubleshooting

## 🎨 Características dos Templates

### Candidatos
- ✅ Gradiente azul Beauty Smile (#00109E → #0066CC)
- ✅ Logo e marca Beauty Smile
- ✅ Linguagem acolhedora
- ✅ Design moderno e clean
- ✅ Responsivo para mobile

### Administradores
- ✅ Badge "Painel Administrativo" dourado
- ✅ Avisos de segurança em destaque
- ✅ Visual corporativo
- ✅ Recomendações de segurança
- ✅ Mensagens mais formais

## 🔧 Variáveis Supabase

Ambos os templates utilizam a variável do Supabase:

- `{{ .ConfirmationURL }}` - Link para redefinição de senha

Esta variável é automaticamente substituída pelo Supabase com o link único e temporário.

## 📋 Próximos Passos

1. Leia o [SETUP_GUIDE.md](./SETUP_GUIDE.md)
2. Acesse o Supabase Dashboard
3. Configure o template "Reset Password"
4. Teste o envio de emails
5. Valide em diferentes clientes (Gmail, Outlook, Apple Mail)

## 🔗 Links Úteis

- **Projeto Supabase**: https://isljnozzlvckrgjjbjwp.supabase.co
- **Supabase Dashboard**: https://app.supabase.com
- **Documentação Supabase Auth**: https://supabase.com/docs/guides/auth

## ✅ Status

- ✅ Templates HTML criados
- ✅ Templates texto criados
- ✅ Guia de setup criado
- ⏳ Configuração no Supabase (manual)
- ⏳ Testes em produção

---

**Última atualização**: 2025
**Versão**: 1.0
