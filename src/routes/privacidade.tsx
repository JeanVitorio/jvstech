import { createFileRoute } from "@tanstack/react-router";
import { COMPANY } from "@/components/site/legal/company";
import { LegalList, LegalPage, LegalSection } from "@/components/site/legal/LegalPage";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — JVS LeadFlow" },
      {
        name: "description",
        content: "Como o JVS LeadFlow trata dados pessoais, conforme a LGPD.",
      },
    ],
  }),
  component: PrivacyPage,
});

// Finalidades do tratamento e a base legal correspondente (art. 7º da LGPD).
const purposes = [
  ["Criar e manter sua conta e prestar o serviço contratado", "Execução de contrato"],
  [
    "Falar com você sobre a conta, suporte e avisos importantes (e-mail e WhatsApp)",
    "Execução de contrato",
  ],
  ["Cobrar os planos pagos e emitir documentos fiscais", "Execução de contrato e obrigação legal"],
  [
    "Proteger a conta, prevenir fraudes e manter registros de acesso",
    "Obrigação legal e legítimo interesse",
  ],
  ["Enviar novidades do LeadFlow (você pode pedir para não receber)", "Legítimo interesse"],
];

function PrivacyPage() {
  return (
    <LegalPage
      title="Política de Privacidade"
      summary="Esta Política explica quais dados pessoais o JVS LeadFlow coleta, por que coleta, com quem compartilha e como você pode exercer seus direitos, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018 — LGPD)."
    >
      <LegalSection title="1. Controlador e encarregado">
        <p>
          O controlador dos dados da sua conta é {COMPANY.legalName}, CNPJ {COMPANY.cnpj},{" "}
          {COMPANY.city}. O encarregado pelo tratamento de dados pessoais (DPO) é {COMPANY.dpoName},
          pelo e-mail{" "}
          <a className="text-primary underline" href={`mailto:${COMPANY.email}`}>
            {COMPANY.email}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Dados que coletamos">
        <LegalList
          items={[
            <>
              <strong>Cadastro:</strong> nome, nome da empresa, e-mail, WhatsApp e senha (guardada
              de forma criptografada pelo provedor de autenticação).
            </>,
            <>
              <strong>Uso do serviço:</strong> data e hora de acesso, endereço IP, navegador, ações
              realizadas e registros técnicos de erro.
            </>,
            <>
              <strong>Pagamento:</strong> plano contratado e situação da assinatura. Os dados do
              cartão são tratados diretamente pela Stripe e não ficam com a JVS.
            </>,
            <>
              <strong>Aplicativo para computador:</strong> nome do computador, sistema operacional,
              versão do aplicativo e registros de funcionamento dos agentes.
            </>,
            <>
              <strong>Dados inseridos por você:</strong> leads, funil, mensagens e configurações dos
              agentes.
            </>,
          ]}
        />
        <p>Coletamos apenas o necessário para essas finalidades. Não coletamos dados sensíveis.</p>
      </LegalSection>

      <LegalSection title="3. Para que usamos e base legal">
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.04] text-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Finalidade
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Base legal
                </th>
              </tr>
            </thead>
            <tbody>
              {purposes.map(([purpose, basis]) => (
                <tr key={purpose} className="border-t border-border">
                  <td className="px-4 py-3">{purpose}</td>
                  <td className="px-4 py-3">{basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection title="4. Dados dos leads">
        <p>
          Os leads são encontrados a partir das buscas configuradas pelo cliente em informações
          publicamente disponíveis. Para esses dados, o cliente é o controlador e a JVS é a
          operadora, conforme os{" "}
          <a className="text-primary underline" href="/termos">
            Termos de Uso
          </a>
          . Se você foi encontrado como lead e quer saber mais ou pedir a exclusão, escreva para{" "}
          {COMPANY.email}: encaminharemos o pedido ao cliente responsável e removeremos os dados dos
          nossos sistemas quando cabível.
        </p>
      </LegalSection>

      <LegalSection title="5. Com quem compartilhamos">
        <p>
          Não vendemos dados pessoais. Compartilhamos apenas com fornecedores necessários ao
          serviço:
        </p>
        <LegalList
          items={[
            "Supabase — banco de dados, autenticação e armazenamento;",
            "Stripe — processamento de pagamentos e assinaturas;",
            "Netlify — hospedagem do site e do aplicativo web;",
            "GitHub — distribuição das atualizações do aplicativo para computador;",
            "Google Fonts — carregamento das fontes do site (recebe o endereço IP do visitante);",
            "autoridades públicas, quando exigido por lei ou ordem judicial.",
          ]}
        />
      </LegalSection>

      <LegalSection title="6. Transferência internacional">
        <p>
          Alguns desses fornecedores armazenam dados fora do Brasil. Nesses casos, a transferência
          segue o art. 33 da LGPD, com fornecedores que adotam cláusulas contratuais e medidas de
          segurança compatíveis com a lei.
        </p>
      </LegalSection>

      <LegalSection title="7. Por quanto tempo guardamos">
        <LegalList
          items={[
            "Dados da conta e dados inseridos por você: enquanto a conta estiver ativa.",
            "Registros de acesso: por no mínimo 6 meses, conforme o Marco Civil da Internet.",
            "Dados de cobrança e fiscais: pelo prazo exigido pela legislação tributária (em geral, 5 anos).",
          ]}
        />
        <p>Encerrada a conta, os demais dados são excluídos ou anonimizados.</p>
      </LegalSection>

      <LegalSection title="8. Segurança">
        <p>
          Usamos conexão criptografada (HTTPS), controle de acesso por empresa no banco de dados,
          chaves de acesso restritas e atualizações de segurança. Nenhum sistema é totalmente imune
          a incidentes; se ocorrer algum que gere risco relevante, avisaremos os afetados e a ANPD
          conforme a lei.
        </p>
      </LegalSection>

      <LegalSection title="9. Seus direitos">
        <p>Pela LGPD (art. 18), você pode pedir a qualquer momento:</p>
        <LegalList
          items={[
            "confirmação de que tratamos seus dados e acesso a eles;",
            "correção de dados incompletos ou desatualizados;",
            "anonimização, bloqueio ou exclusão de dados desnecessários;",
            "portabilidade dos dados;",
            "informação sobre com quem compartilhamos seus dados;",
            "revogação do consentimento e oposição a tratamentos baseados em legítimo interesse.",
          ]}
        />
        <p>
          Envie o pedido para {COMPANY.email}. Respondemos em até 15 dias. Você também pode reclamar
          à Autoridade Nacional de Proteção de Dados (ANPD).
        </p>
      </LegalSection>

      <LegalSection title="10. Cookies">
        <p>
          Usamos apenas armazenamento essencial para o funcionamento do serviço. Veja a{" "}
          <a className="text-primary underline" href="/cookies">
            Política de Cookies
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="11. Alterações">
        <p>
          Esta Política pode ser atualizada. A data da versão vigente fica no topo da página, e
          mudanças relevantes serão avisadas no aplicativo.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
