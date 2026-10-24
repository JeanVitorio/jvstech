import { createFileRoute } from "@tanstack/react-router";
import { COMPANY } from "@/components/site/legal/company";
import { LegalList, LegalPage, LegalSection } from "@/components/site/legal/LegalPage";

export const Route = createFileRoute("/reembolso")({
  head: () => ({
    meta: [
      { title: "Reembolso e Cancelamento — JVS LeadFlow" },
      {
        name: "description",
        content: "Regras de cancelamento e reembolso dos planos do JVS LeadFlow.",
      },
    ],
  }),
  component: RefundPage,
});

function RefundPage() {
  return (
    <LegalPage
      title="Política de Reembolso e Cancelamento"
      summary="Sem fidelidade e sem multa: você pode cancelar quando quiser. Na primeira contratação de um plano pago, você tem 7 dias para desistir com reembolso integral."
    >
      <LegalSection title="1. Plano Free">
        <p>O plano Free não tem cobrança, por isso não há valores a reembolsar.</p>
      </LegalSection>

      <LegalSection title="2. Direito de arrependimento (7 dias)">
        <p>
          Na primeira contratação de um plano pago, você pode desistir em até 7 dias corridos
          contados do pagamento e receber <strong>reembolso integral</strong>, conforme o art. 49 do
          Código de Defesa do Consumidor.
        </p>
        <LegalList
          items={[
            `Para pedir, escreva para ${COMPANY.email} ou chame no WhatsApp ${COMPANY.whatsapp} informando o e-mail da conta.`,
            "O estorno é feito pela Stripe no mesmo meio de pagamento. O prazo para aparecer na fatura depende da operadora do cartão (em geral, até 2 faturas).",
            "Após o reembolso, a conta volta para o plano Free.",
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Cancelamento após 7 dias">
        <LegalList
          items={[
            "Você pode cancelar a qualquer momento pela tela Cobrança, no aplicativo, sem multa.",
            "O plano continua ativo até o fim do período já pago, e não haverá novas cobranças.",
            "Não há reembolso proporcional dos dias restantes do mês em curso.",
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Troca de plano">
        <p>
          Você pode mudar de plano pela tela Cobrança. Os valores da troca são exibidos pela Stripe
          antes da confirmação.
        </p>
      </LegalSection>

      <LegalSection title="5. Cobrança indevida">
        <p>
          Se houver cobrança em duplicidade ou por erro nosso, o valor será devolvido integralmente.
          Entre em contato pelos canais acima.
        </p>
      </LegalSection>

      <LegalSection title="6. Suspensão por violação dos Termos">
        <p>
          Contas suspensas ou encerradas por violação dos{" "}
          <a className="text-primary underline" href="/termos">
            Termos de Uso
          </a>{" "}
          não têm direito a reembolso do período em curso, ressalvado o direito de arrependimento
          previsto em lei.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
