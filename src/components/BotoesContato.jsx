import React from 'react';
import { MessageCircle, Navigation, MapPin } from 'lucide-react';
import { linkWhatsapp, linkWaze, linkMaps } from '../lib/helpers';

export default function BotoesContato({ telefone, endereco, tamanho = 'normal' }) {
  const wa = linkWhatsapp(telefone);
  const waze = linkWaze(endereco);
  const maps = linkMaps(endereco);

  if (!wa && !waze && !maps) return null;

  const tam = tamanho === 'compacto' ? 'w-6 h-6' : 'w-8 h-8';
  const icone = tamanho === 'compacto' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  const parar = (e) => e.stopPropagation();

  return (
    <div className="flex items-center gap-1.5" onClick={parar}>
      {wa && (
        <a
          href={wa} target="_blank" rel="noreferrer" onClick={parar} title="Abrir WhatsApp"
          className={`${tam} rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center shrink-0`}
        >
          <MessageCircle className={icone} />
        </a>
      )}
      {waze && (
        <a
          href={waze} target="_blank" rel="noreferrer" onClick={parar} title="Abrir no Waze"
          className={`${tam} rounded-full bg-sky-50 text-sky-600 hover:bg-sky-100 flex items-center justify-center shrink-0`}
        >
          <Navigation className={icone} />
        </a>
      )}
      {maps && (
        <a
          href={maps} target="_blank" rel="noreferrer" onClick={parar} title="Abrir no Google Maps"
          className={`${tam} rounded-full bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center shrink-0`}
        >
          <MapPin className={icone} />
        </a>
      )}
    </div>
  );
}
