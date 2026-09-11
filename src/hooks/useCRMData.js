import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export function useCRMData() {
  const [clientes, setClientes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    const { data, error } = await supabase
      .from('clientes')
      .select(`
        *,
        contratos ( * ),
        acompanhamento ( * ),
        historico ( * )
      `)
      .order('razao_social', { ascending: true });

    if (error) {
      console.error(error);
      setErro('Não foi possível carregar os dados do Supabase.');
      setCarregando(false);
      return;
    }

    const normalizados = (data || []).map((c) => {
      // acompanhamento é 1-para-1 (cliente_id é único), o Supabase pode retornar
      // como objeto único OU como array de 1 item dependendo da versão — tratamos os dois casos
      const acompRaw = c.acompanhamento;
      const acompanhamento = Array.isArray(acompRaw) ? (acompRaw[0] || null) : (acompRaw || null);

      return {
        ...c,
        contrato: (c.contratos || [])[0] || null,
        contratos: c.contratos || [],
        acompanhamento,
        historico: (c.historico || [])
          .slice()
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
      };
    });

    setClientes(normalizados);
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return { clientes, carregando, erro, recarregar: carregar };
}
