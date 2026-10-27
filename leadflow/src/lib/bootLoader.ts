// Esconde o loading do HTML quando o app já pode pintar a tela de verdade.
export function hideBootLoader() {
  const boot = document.getElementById("jvs-boot");
  if (!boot || boot.classList.contains("is-done")) return;
  boot.classList.add("is-done");
  window.setTimeout(() => boot.remove(), 400);
}
