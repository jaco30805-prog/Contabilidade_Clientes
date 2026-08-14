# Voal Consult — Inteligência & Gestão Contábil

Plataforma autônoma e moderna desenvolvida em **JavaScript Puro (Vanilla JS)** para gestão cadastral, controle fiscal, compliance de certidões e acompanhamento de obrigações acessórias da **Voal Consult**.

---

## ⚡ Como Executar

Basta abrir o arquivo `index.html` diretamente no seu navegador preferido (Google Chrome, Safari, Edge, Firefox, Brave):

```bash
open /Users/jaco0moreira/Documents/Contabilidade_Clientes/index.html
```

Não requer instalação de Node.js, servidores locais ou bancos de dados externos. Funciona 100% offline com persistência em `localStorage`.

---

## 💎 Recursos e Módulos da Voal Consult

1. **Dashboard Executivo Bento Grid**: Indicadores de empresas ativas, receita recorrente mensal (MRR), percentual de cumprimento de obrigações fiscais e painel de alertas críticos.
2. **Carteira de Clientes**: Busca instantânea com suporte a atalho (`⌘K` / `Ctrl+K`), filtros por regime tributário e atalhos rápidos de WhatsApp.
3. **Dossiê 360° do Cliente**:
   - Dados Cadastrais e Endereço com busca automática de CEP via ViaCEP API.
   - Enquadramento Fiscal e CNAEs (Principal e Secundários).
   - Quadro Societário (QSA) com % de participação e pró-labore.
   - Certificado Digital (A1/A3) com contagem regressiva de validade.
   - Matriz de CNDs (Federal, Estadual, Municipal, FGTS e Trabalhista).
   - Contrato de Honorários e cláusulas de 13º.
   - Histórico de Atendimentos e Linha do Tempo.
   - Impressão formatada para folha A4.
4. **Calendário Fiscal de Obrigações**: Apurações automáticas (PGDAS, DCTFWeb, EFD-Reinf, SPED Fiscal, FGTS Digital, ECD, ECF, DASN) por competência mensal com registro de protocolos e recibos.
5. **Relatórios e Backups**: Exportação em lote para Excel (.csv) e rotinas de backup e restauração (.json).
