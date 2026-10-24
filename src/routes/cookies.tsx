import { createFileRoute } from "@tanstack/react-router";
import { LegalList, LegalPage, LegalSection } from "@/components/site/legal/LegalPage";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Política de Cookies — JVS LeadFlow" },
      { name: "description", content: "Cookies e armazenamento local usados pelo JVS LeadFlow." },
    ],
  }),
  component: CookiesPage,
});

function CookiesPage() {
  return (
    <LegalPage
      title="Política de Cookies"
      summary="Cookies e armazenamento local são pequenos arquivos guardados no seu navegador. O JVS LeadFlow usa apenas os essenciais para funcionar. Não usamos cookies de publicidade nem de rastreamento."
    >
      <LegalSection title="1. O que usamos">
        <LegalList
          items={[
            <>
              <strong>Sessão de login:</strong> mantém você conectado ao aplicativo com segurança.
            </>,
            <>
              <strong>Preferências:</strong> lembra escolhas de interface, como o tema e o menu
              lateral aberto ou fechado.
            </>,
            <>
              <strong>Pagamento:</strong> ao assinar um plano, a página de pagamento da Stripe usa
              cookies próprios para segurança e prevenção de fraudes.
            </>,
          ]}
        />
        <p>
          Esses itens são necessários para o serviço funcionar e por isso não dependem de
          consentimento.
        </p>
      </LegalSection>

      <LegalSection title="2. Serviços de terceiros">
        <p>
          As fontes do site são carregadas do Google Fonts, que recebe o endereço IP do visitante
          para entregar os arquivos. Não usamos Google Analytics, pixels de anúncios ou ferramentas
          semelhantes.
        </p>
      </LegalSection>

      <LegalSection title="3. Mudanças futuras">
        <p>
          Se passarmos a usar cookies de medição ou de publicidade, esta página será atualizada e
          pediremos o seu consentimento antes de ativá-los.
        </p>
      </LegalSection>

      <LegalSection title="4. Como gerenciar">
        <p>
          Você pode apagar ou bloquear cookies nas configurações do seu navegador. Bloquear os
          essenciais pode impedir o login no aplicativo.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
