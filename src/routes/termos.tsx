import { createFileRoute } from "@tanstack/react-router";
import { COMPANY } from "@/components/site/legal/company";
import { LegalList, LegalPage, LegalSection } from "@/components/site/legal/LegalPage";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — JVS LeadFlow" },
      { name: "description", content: "Termos de Uso do JVS LeadFlow." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage
      title="Termos de Uso"
      summary="Estes Termos regulam o uso do JVS LeadFlow, incluindo o site, o aplicativo web e o aplicativo para computador. Ao criar uma conta ou usar o serviço, você declara que leu, entendeu e concorda com estas condições."
    >
      <LegalSection title="1. Quem somos">
        <p>
          O JVS LeadFlow é fornecido por {COMPANY.legalName}, inscrita no CNPJ {COMPANY.cnpj}, com
          sede em {COMPANY.city} ("JVS", "nós"). Contato: {COMPANY.email} ou WhatsApp{" "}
          {COMPANY.whatsapp}.
        </p>
      </LegalSection>

      <LegalSection title="2. O serviço">
        <p>
          O LeadFlow é uma ferramenta de prospecção comercial que localiza empresas a partir de
          informações publicamente disponíveis, organiza os contatos encontrados e oferece gestão de
          leads, equipe e funil de vendas. Parte do serviço funciona por meio do aplicativo para
          computador, que executa os agentes de prospecção no equipamento do cliente.
        </p>
      </LegalSection>

      <LegalSection title="3. Cadastro e conta">
        <LegalList
          items={[
            "O cadastro é destinado a empresas e profissionais maiores de 18 anos, com capacidade para contratar.",
            "Você deve informar dados verdadeiros e mantê-los atualizados.",
            "A senha é pessoal. Você é responsável pelas ações realizadas na sua conta e pelos usuários que convidar para a sua empresa.",
            "Avise-nos imediatamente em caso de uso não autorizado da conta.",
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Planos, pagamento e limites">
        <LegalList
          items={[
            "O plano Free é gratuito e possui limite mensal de leads. Os planos pagos são cobrados mensalmente, de forma recorrente, até o cancelamento.",
            "Os pagamentos são processados pela Stripe. A JVS não armazena os dados completos do seu cartão.",
            "Cada plano possui limite mensal de leads e de usuários, conforme descrito na página de planos no momento da contratação.",
            "Eventuais reajustes de preço serão comunicados com pelo menos 30 dias de antecedência e valerão a partir do ciclo seguinte.",
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Cancelamento e reembolso">
        <p>
          Você pode cancelar a qualquer momento, sem multa. As regras de arrependimento e reembolso
          estão na{" "}
          <a className="text-primary underline" href="/reembolso">
            Política de Reembolso e Cancelamento
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="6. Uso permitido">
        <p>Ao usar o LeadFlow, você se compromete a não:</p>
        <LegalList
          items={[
            "enviar spam, mensagens em massa não solicitadas ou conteúdo enganoso, ofensivo ou ilegal;",
            "usar os dados obtidos para fins discriminatórios, fraudulentos ou incompatíveis com a legislação;",
            "revender, sublicenciar ou copiar o serviço sem autorização por escrito;",
            "tentar acessar dados de outros clientes, burlar limites do plano ou comprometer a segurança do sistema.",
          ]}
        />
      </LegalSection>

      <LegalSection title="7. Fontes de dados e Google">
        <p>
          Os agentes de prospecção consultam informações que as próprias empresas tornam públicas,
          como as exibidas no Google Maps e em seus sites. A JVS não tem vínculo, parceria ou
          endosso do Google, e as marcas citadas pertencem aos seus titulares.
        </p>
        <p>
          O uso de serviços de terceiros está sujeito às regras desses serviços. Cabe ao cliente
          definir as buscas, avaliar se o uso dos dados é adequado ao seu negócio e responder pela
          forma como utiliza as informações obtidas. Não garantimos que todas as empresas ou
          contatos sejam encontrados, nem a exatidão dos dados publicados por terceiros.
        </p>
      </LegalSection>

      <LegalSection title="8. WhatsApp não oficial">
        <p>
          A validação de números e os agentes de mensagens usam uma conexão com o WhatsApp Web feita
          a partir do computador do cliente. Essa integração <strong>não é oficial</strong> e não
          tem vínculo com a Meta ou com o WhatsApp.
        </p>
        <LegalList
          items={[
            "O WhatsApp pode restringir, suspender ou banir números que considere em desacordo com suas regras. Recomendamos usar um número secundário.",
            "A JVS não se responsabiliza por bloqueios, banimentos ou perda de acesso ao número conectado.",
            "O cliente é responsável pelo conteúdo, pela frequência e pelos destinatários das mensagens enviadas pelos seus agentes, e deve oferecer aos contatos uma forma simples de não receber novas mensagens.",
          ]}
        />
      </LegalSection>

      <LegalSection title="9. Dados pessoais dos leads (LGPD)">
        <p>
          Alguns leads podem conter dados pessoais, como o telefone de um profissional autônomo. Em
          relação a esses dados, o <strong>cliente é o controlador</strong>: ele decide quais buscas
          fazer e como usar os contatos. A <strong>JVS atua como operadora</strong>, tratando esses
          dados apenas para prestar o serviço contratado.
        </p>
        <p>
          O cliente deve ter base legal para o tratamento (por exemplo, legítimo interesse na
          prospecção comercial), respeitar os direitos dos titulares e atender pedidos de exclusão
          ou de não recebimento de contato. Mais detalhes na{" "}
          <a className="text-primary underline" href="/privacidade">
            Política de Privacidade
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="10. Aplicativo para computador">
        <p>
          O aplicativo é instalado no computador do cliente e recebe atualizações automáticas para
          correções e melhorias de segurança. O cliente é responsável pelo equipamento, pela conexão
          à internet e por manter espaço em disco e permissões necessárias.
        </p>
      </LegalSection>

      <LegalSection title="11. Disponibilidade e suporte">
        <p>
          Trabalhamos para manter o serviço disponível, mas podem ocorrer interrupções por
          manutenção, falhas de terceiros (hospedagem, pagamentos, Google, WhatsApp) ou motivos de
          força maior. O suporte é prestado pelos canais informados nestes Termos.
        </p>
      </LegalSection>

      <LegalSection title="12. Limitação de responsabilidade">
        <p>
          O LeadFlow é uma ferramenta de apoio à prospecção e não garante vendas, faturamento ou
          resultados comerciais. Respeitados os direitos previstos no Código de Defesa do Consumidor
          quando aplicável, a responsabilidade da JVS fica limitada aos valores pagos pelo cliente
          nos 12 meses anteriores ao fato que originou o pedido.
        </p>
      </LegalSection>

      <LegalSection title="13. Propriedade intelectual">
        <p>
          O software, a marca, o layout e os materiais do LeadFlow pertencem à JVS. Os dados
          inseridos pelo cliente continuam sendo do cliente.
        </p>
      </LegalSection>

      <LegalSection title="14. Suspensão e encerramento">
        <p>
          Podemos suspender ou encerrar contas que violem estes Termos ou a legislação, após aviso
          sempre que possível. Ao encerrar a conta, os dados são tratados conforme a Política de
          Privacidade.
        </p>
      </LegalSection>

      <LegalSection title="15. Alterações destes Termos">
        <p>
          Podemos atualizar estes Termos. Mudanças relevantes serão comunicadas no aplicativo e
          poderão exigir um novo aceite para continuar usando o serviço.
        </p>
      </LegalSection>

      <LegalSection title="16. Lei aplicável e foro">
        <p>
          Estes Termos seguem as leis brasileiras. Fica eleito o foro de {COMPANY.city} para
          resolver eventuais conflitos, ressalvado o direito do consumidor de propor ação no foro do
          seu domicílio.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
