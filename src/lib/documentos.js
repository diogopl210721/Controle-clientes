export const MOTIVOS = [
  { valor: 'troca_cnpj', label: 'Troca de CNPJ', aliases: ['troca de titularidade', 'titularidade'] },
  { valor: 'alteracao_endereco', label: 'Alteração de Endereço', aliases: [] },
  { valor: 'redimensionar', label: 'Redimensionar', aliases: ['redimensionamento'] },
  { valor: 'implantacao_conta_sim', label: 'Implantação Conta SIM', aliases: ['conta sim'] },
  { valor: 'renegociacao_preco', label: 'Renegociação de Preço', aliases: ['renegociação de contrato'] },
];

export const TIPOS_CLIENTE = [
  { valor: 'industria_comercio_servico', label: 'Indústrias/Comércios/Serviços' },
  { valor: 'condominio_conta_sim', label: 'Condomínio/Condomínio Conta SIM' },
  { valor: 'pessoa_fisica', label: 'Pessoa Física' },
];

export function labelMotivo(valor) {
  return MOTIVOS.find((m) => m.valor === valor)?.label ?? valor;
}

export function labelTipoCliente(valor) {
  return TIPOS_CLIENTE.find((t) => t.valor === valor)?.label ?? valor;
}
