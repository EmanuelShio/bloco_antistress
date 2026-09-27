# Bloco Antistress

Brinquedo virtual antistress mobile-first: toque, pressione e arraste o bloco
para relaxar. HTML5 + CSS3 + JavaScript puro, sem frameworks e sem backend.

## Estrutura

```
/index.html          tela e marcação do app
/style.css           temas, layout responsivo, animações
/app.js              controlador principal (telas, configurações, temas)
/audio.js            sons sintetizados via Web Audio API
/game.js             interações do bloco (toque, pressão, arrasto, combos)
/storage.js          camada de persistência (localStorage)
/pwa.js              registro do service worker e prompt de instalação
/manifest.json       manifesto do PWA
/service-worker.js   cache offline
/icons/              ícones do app (192, 512, 512 maskable, 180 apple-touch)
```

## Testar localmente

Service workers exigem um servidor (não funcionam abrindo o `index.html`
diretamente com `file://`). Na pasta do projeto:

```bash
python3 -m http.server 8080
```

Depois acesse `http://localhost:8080` no celular (mesma rede Wi-Fi) ou no
Chrome do computador com o DevTools em modo responsivo/Android.

Para publicar, envie a pasta inteira (mantendo a estrutura de arquivos) para
qualquer hospedagem estática com HTTPS (GitHub Pages, Netlify, Vercel, etc.).
HTTPS é obrigatório para o service worker e para a instalação como PWA — o
único caso sem HTTPS que funciona é `localhost`.

## Converter em APK com o PWABuilder

1. Publique o site em uma URL com HTTPS (passo acima).
2. Acesse [pwabuilder.com](https://www.pwabuilder.com) e informe a URL.
3. O PWABuilder vai ler o `manifest.json` e o `service-worker.js`
   automaticamente e mostrar a pontuação do PWA.
4. Escolha o pacote **Android** e gere o APK/AAB assinado.

## Funcionalidades

- Interações: toque rápido, pressão longa, arrasto, múltiplos toques
  simultâneos e combos de toques rápidos, cada uma com feedback visual
  (ondulações, partículas, deformação do bloco), sonoro (Web Audio API,
  sem arquivos externos) e tátil (`navigator.vibrate`, com verificação de
  suporte).
- Modo Relaxante (sem pontuação) e Modo Desafio (barra de energia que
  acumula com sequências de interação).
- Estatísticas locais: toques totais, interações, tempo jogado, maior
  sequência e interações especiais descobertas.
- Configurações persistidas em `localStorage`: som, vibração, volume,
  intensidade das animações e tema (Relaxante, Escuro, Neon).
- Funciona 100% offline após o primeiro carregamento; não usa backend,
  não coleta dados pessoais e não exibe anúncios.
