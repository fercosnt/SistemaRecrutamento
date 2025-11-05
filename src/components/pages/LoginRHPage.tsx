import React, { useState } from 'react';
import { BackgroundImage } from '../BackgroundImage';
import { BeautySmileLogo } from '../BeautySmileLogo';
import { GlassCard, GlassButton, Glass } from '../ui/glass';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export function LoginRHPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="relative min-h-screen">
      <BackgroundImage 
        background="darkBlue" 
        className="min-h-screen"
      >
        <div className="flex items-center justify-center min-h-screen py-20 px-4">
          <GlassCard variant="white" blur="xl" className="max-w-md w-full">
            <div className="space-y-6">
              {/* Logo e título */}
              <div className="text-center">
                <BeautySmileLogo type="horizontal" size="lg" variant="white" className="mx-auto mb-6" />
                <h1 className="text-white text-3xl mb-2">Área RH</h1>
                <p className="text-white/80">Acesse o sistema de recrutamento</p>
              </div>

              {/* Formulário */}
              <Glass variant="white" blur="md" className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu.email@beautysmile.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white/10 border-white/30 text-white placeholder:text-white/50 backdrop-blur-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white/10 border-white/30 text-white placeholder:text-white/50 backdrop-blur-sm"
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 text-white/80 cursor-pointer">
                    <input type="checkbox" className="rounded border-white/30 bg-white/10" />
                    <span>Lembrar-me</span>
                  </label>
                  <a href="#" className="text-white/80 hover:text-white transition-colors">
                    Esqueci a senha
                  </a>
                </div>
              </Glass>

              {/* Botões */}
              <div className="space-y-3">
                <GlassButton variant="white" hover className="w-full py-4 text-white text-lg">
                  Entrar
                </GlassButton>

                <p className="text-center text-white/60 text-sm">
                  Não tem acesso? <a href="#" className="text-white/80 hover:text-white transition-colors">Solicitar credenciais</a>
                </p>
              </div>

              {/* Informações de segurança */}
              <Glass variant="white" blur="sm" className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md flex-shrink-0">
                    <span className="text-xl">🔒</span>
                  </div>
                  <div>
                    <p className="text-white text-sm mb-1">Conexão Segura</p>
                    <p className="text-white/70 text-xs">
                      Seus dados estão protegidos com criptografia de ponta a ponta
                    </p>
                  </div>
                </div>
              </Glass>
            </div>
          </GlassCard>
        </div>
      </BackgroundImage>
    </div>
  );
}
