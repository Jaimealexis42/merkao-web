// Estado de la última corrida de la publicación diaria en Facebook e Instagram.
// Usa la API pública de GitHub (el repo es público). Los scripts de meta-api
// emiten anotaciones "::error title=Facebook (post)::…" que dicen qué falló.

const REPO = 'https://api.github.com/repos/Jaimealexis42/merkao-web'
const WORKFLOW = 'merkao-facebook-post.yml'
const MAX_HORAS = 36

type Anotacion = { annotation_level: string; title: string | null; message: string }

async function leer<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'merkao-resumen' },
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error('GitHub ' + res.status)
  return res.json() as Promise<T>
}

export function interpretar(anotaciones: Anotacion[], conclusion: string): { ok: boolean; texto: string } {
  const fallos = anotaciones.filter((a) => a.annotation_level === 'failure')
  const redes = ['Facebook', 'Instagram'].map((red) => {
    const fallo = fallos.find((a) => a.title?.startsWith(red))
    if (!fallo) return { red, motivo: null }
    const vencido = /session has expired|access token/i.test(fallo.message)
    return { red, motivo: vencido ? 'token vencido o inválido' : fallo.message.slice(0, 120) }
  })
  const algunaRed = redes.some((r) => r.motivo)
  if (conclusion !== 'success' && !algunaRed) {
    return { ok: false, texto: 'la tarea FALLÓ (' + conclusion + '). Revisa GitHub Actions.' }
  }
  return {
    ok: !algunaRed,
    texto: redes.map((r) => r.red + (r.motivo ? ' FALLÓ (' + r.motivo + ')' : ' OK')).join(' · '),
  }
}

export async function estadoPublicaciones(): Promise<{ ok: boolean; texto: string }> {
  try {
    const { workflow_runs } = await leer<{ workflow_runs: { id: number; conclusion: string; created_at: string }[] }>(
      REPO + '/actions/workflows/' + WORKFLOW + '/runs?status=completed&per_page=1',
    )
    const run = workflow_runs[0]
    if (!run || Date.now() - Date.parse(run.created_at) > MAX_HORAS * 3_600_000) {
      return { ok: false, texto: 'no hubo ninguna corrida en las últimas ' + MAX_HORAS + ' horas.' }
    }
    const { jobs } = await leer<{ jobs: { check_run_url: string }[] }>(REPO + '/actions/runs/' + run.id + '/jobs')
    const listas = await Promise.all(jobs.map((j) => leer<Anotacion[]>(j.check_run_url + '/annotations')))
    return interpretar(listas.flat(), run.conclusion)
  } catch (e) {
    return { ok: false, texto: 'no se pudo comprobar (' + (e instanceof Error ? e.message : String(e)) + ').' }
  }
}
