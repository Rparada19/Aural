import Anthropic from '@anthropic-ai/sdk';

// Pide a la IA que responda con una herramienta. Algunos modelos no aceptan forzar la herramienta,
// así que se pide de forma explícita y se reintenta si la respuesta no la trae.
export async function createWithTool(params) {
  const name = params.tool_choice?.name || params.tools?.[0]?.name;
  const req = {
    ...params,
    tool_choice: { type: 'auto' },
    system: `${params.system || ''}\n\nResponde únicamente llamando la herramienta "${name}" con el resultado completo. No escribas texto fuera de la herramienta.`,
  };
  const client = new Anthropic();
  let res;
  for (let i = 0; i < 3; i++) {
    res = await client.messages.create(req);
    if (res.content.some((c) => c.type === 'tool_use' && c.name === name)) return res;
  }
  return res;
}
