/** The 11 steps of "Recorrido de la pieza" (docs/flujo-de-trabajo.md, section A). */

export type Sala = "Entender" | "Leer" | "Hablar" | "Escribir" | "Oído" | "Repaso";

/** What the action button of a step does. `null` = the tool does not exist yet. */
export type StepAction =
  | "ficha-tonalidad"
  | "tocar-lento"
  | "ficha-escala"
  | "estudiar"
  | "ficha-circulo";

export interface RecorridoStep {
  n: number;
  day: string;
  sala: Sala;
  title: string;
  time: string;
  /** 2–4 atomic instructions. */
  items: string[];
  action: { kind: StepAction; label: string } | null;
  /** True when the tool for this step does not exist yet: the card shows the calm "not yet" line. */
  noTool?: boolean;
  /** Optional calm extra line. */
  note?: string;
}

export const NO_TOOL_LINE = "Esta herramienta todavía no existe en la app; por ahora hacelo así.";

export const STEPS: RecorridoStep[] = [
  {
    n: 1,
    day: "Día 1",
    sala: "Entender",
    title: "Mirar la Ficha, sin tocar",
    time: "5 min",
    items: [
      "Apretá el botón de abajo para abrir la Ficha.",
      "Mirá la tonalidad y el compás.",
      "Mirá la escala: sus 7 notas en tus colores.",
      "Mirá los 7 acordes de la escala. Todavía no toques nada.",
    ],
    action: { kind: "ficha-tonalidad", label: "Abrir la Ficha" },
  },
  {
    n: 2,
    day: "Día 1",
    sala: "Leer",
    title: "Solo el ritmo",
    time: "5 min",
    items: [
      "Apretá el botón de abajo: pasa a Tocar y baja el tempo al 60%.",
      "Apretá Reproducir.",
      "Mientras suena, aplaudí el ritmo o tocalo en una sola nota.",
      "Si te perdés, apretá Detener y empezá de nuevo.",
    ],
    action: { kind: "tocar-lento", label: "Ir a Tocar al 60%" },
  },
  {
    n: 3,
    day: "Día 1",
    sala: "Entender",
    title: "Escala y acorde de tónica",
    time: "5 min",
    items: [
      "Apretá el botón de abajo para ver la escala en la Ficha.",
      "Escuchala con \"Escuchar\".",
      "Tocala en tu teclado, subiendo, una octava.",
      "Tocá el acorde de tónica, todo junto.",
    ],
    action: { kind: "ficha-escala", label: "Abrir la escala" },
    note: "El círculo de quintas todavía no existe en la app.",
  },
  {
    n: 4,
    day: "Día 2",
    sala: "Oído",
    title: "Cantar el primer compás por dentro",
    time: "5 min",
    items: [
      "Mirá el primer compás, sin tocar.",
      "Cantalo por dentro, nota por nota.",
      "Ahora tocalo en el teclado.",
      "Si no coincide, probá otra vez más lento.",
    ],
    action: null,
    noTool: true,
  },
  {
    n: 5,
    day: "Día 2",
    sala: "Leer",
    title: "Leer toda la pieza en trozos",
    time: "10 min",
    items: [
      "Apretá el botón de abajo para pasar a Estudiar.",
      "Leé de a 2–4 compases, lento y sin parar.",
      "Si te equivocás, seguí igual.",
      "Marcá 2–3 compases difíciles con \"Marcar compás difícil\".",
    ],
    action: { kind: "estudiar", label: "Ir a Estudiar" },
  },
  {
    n: 6,
    day: "Día 3",
    sala: "Leer",
    title: "Solo los puntos difíciles",
    time: "10 min",
    items: [
      "Elegí un compás de tu lista.",
      "Tocalo lento, 3 veces seguidas.",
      "Escuchalo con \"Repetir\" mientras lo mirás.",
      "Sumá el compás de antes y el de después.",
    ],
    action: null,
  },
  {
    n: 7,
    day: "Día 4",
    sala: "Entender",
    title: "Los acordes de la pieza",
    time: "10 min",
    items: [
      "Apretá el botón de abajo: abre el Círculo con los acordes de la pieza.",
      "Con \"Siguiente\" recorré los acordes, de a uno.",
      "Antes de escuchar cada uno, decí su nombre en voz alta.",
      "Tocalo en el teclado.",
    ],
    action: { kind: "ficha-circulo", label: "Abrir el Círculo" },
    note: "El flash de acordes y los tonos guía todavía no existen en la app.",
  },
  {
    n: 8,
    day: "Día 5",
    sala: "Hablar",
    title: "Improvisar sobre los acordes",
    time: "10 min",
    items: [
      "Elegí un acorde de la pieza y tocalo.",
      "Improvisá usando solo las notas de ese acorde.",
      "Otra vuelta: sumá notas de paso (las vecinas).",
      "Al final, probá con toda la escala.",
    ],
    action: null,
    noTool: true,
  },
  {
    n: 9,
    day: "Día 6",
    sala: "Hablar",
    title: "Sacar un motivo y jugar con él",
    time: "10 min",
    items: [
      "Elegí un motivo corto de la pieza (2–4 notas).",
      "Sacalo de oído, sin mirar la partitura.",
      "Pasalo a una tonalidad vecina.",
      "Cambiale una sola cosa (el ritmo o una nota).",
    ],
    action: null,
    noTool: true,
  },
  {
    n: 10,
    day: "Día 7",
    sala: "Escribir",
    title: "Componer una frase de 4 compases",
    time: "15 min",
    items: [
      "Usá el motivo del paso 9.",
      "Armá una frase de 4 compases.",
      "Que el último compás termine en cadencia (de Dom a Tón).",
      "Tocala y anotala en un papel.",
    ],
    action: null,
    noTool: true,
  },
  {
    n: 11,
    day: "Siempre",
    sala: "Repaso",
    title: "Lo que costó se vuelve tarjetas",
    time: "5 min",
    items: [
      "Elegí 2–3 cosas que te costaron.",
      "Escribí cada una en una tarjeta: de un lado la pregunta, del otro la respuesta y el porqué.",
      "Tocá la respuesta en el teclado, no solo la leas.",
      "Repasalas a los 1, 3 y 7 días.",
    ],
    action: null,
    noTool: true,
  },
];

export const DAYS: string[] = [...new Set(STEPS.map((s) => s.day))];
