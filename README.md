# Controle Clientes

Diário de atendimento pós-venda de Diogo Soares. Publicado em https://www.ddsinovacao.com.br/Controle-clientes/ com GitHub Pages, React, Vite e Supabase.

## Funcionalidades

- Painel do dia com atendimentos por consultor, prioridades e alertas de contato/contrato.
- Cadastro manual e importação da ficha PDF Consigaz/Gasball, com o leitor original.
- Assuntos com continuação datada, conclusão e reabertura, na lista e na ficha.
- Exportação local em PDF do atendimento completo ou de um assunto, com paginação.
- Contratos, contatos rápidos, encerramento/reabertura e central editável de processos/documentos.
- Layout adaptado a computador e celular. © Diogo Soares — www.ddsinovacao.com.br.

## Executar e verificar

Requer uma versão de Node compatível com Vite 8.

```sh
npm ci
npm run dev
npm run lint
npm test
npm run build
npm run preview
```

`npm test` verifica os campos extraídos pelo leitor PDF, os limites de datas e a geração dos relatórios completos/individuais e de múltiplas páginas. Os PDFs fictícios de verificação ficam em `../qa/`; nenhum dado é gravado no Supabase pelos testes.

## Dados e publicação

O cliente utiliza o projeto Supabase existente. Não há migração de tabelas nesta atualização. Nesta fase, o acesso continua sem login, conforme a configuração existente do projeto; o código público contém somente a chave pública do cliente, nunca uma chave de serviço.

Para testes isolados, `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` podem apontar para um ambiente de desenvolvimento. Não defina essas variáveis com um ambiente de testes ao gerar a versão de produção.

O código-fonte fica em `main`. O conteúdo de `dist/` é publicado na raiz da branch `gh-pages` pelo comando `npm run deploy`, preservando `base: '/Controle-clientes/'`. O endereço e o domínio existentes permanecem os mesmos. Para reverter, restaure o conteúdo do commit anterior de `gh-pages`.

A importação preenche os campos reconhecidos no PDF; revise as informações antes de salvar. A exportação usa os dados salvos e não transmite o conteúdo para serviços externos de geração de PDF.
