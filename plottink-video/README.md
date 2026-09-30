# PlottInk — "Donde una idea se vuelve pieza"

Cortometraje de marca para **PlottInk · Centro de Servicios Gráficos** (www.plottink.co).
Todo está generado por código: la imagen se dibuja cuadro a cuadro en Canvas, el sonido y la
música se sintetizan desde cero y ffmpeg arma el máster. No hay material de stock ni samples.

## Entregables (`dist/`)

| Pieza | 16:9 (1920×1080) | 9:16 (1080×1920) |
|---|---|---|
| Máster 94 s | `plottink_master_94s_16x9.mp4` | `plottink_master_94s_9x16.mp4` |
| Reels 45 s | `plottink_reels_45s_16x9.mp4` | `plottink_reels_45s_9x16.mp4` |
| Reels 30 s | `plottink_reels_30s_16x9.mp4` | `plottink_reels_30s_9x16.mp4` |

H.264 High, 30 fps, BT.709, AAC 256 kbps 48 kHz, audio masterizado a **−14 LUFS** con pico real ≤ −1.5 dBTP
(el estándar de Instagram/YouTube, para que las plataformas no lo reduzcan ni lo aplasten).

## Logo animado (6 s)

`dist/plottink_logo_1x1.mp4` · `dist/plottink_logo_16x9.mp4` · `dist/plottink_logo_9x16.mp4`

El logo original se vectorizó: las letras y las gotas con potrace sobre la imagen escalada 4× (se conserva el filete
transparente de las letras; sobre la franja roja se ve rojo, como en el original) y las 7 franjas midiendo sus bordes
fila por fila. Así queda nítido a cualquier resolución y las franjas se prolongan de forma natural fuera del cuadro en 16:9 y 9:16.

| Tiempo | Animación | Sonido |
|---|---|---|
| 0.2–1.6 s | Las 7 franjas suben desde el piso y doblan hacia la pared, de izquierda a derecha. | Un *swish* y una nota por franja (pentatónica de Re, ascendente). |
| 1.0–1.9 s | Las letras saltan desde su base con rebote, una por una. | *Pops* burbujeantes que suben de tono. |
| 1.6–2.3 s | La K se contrae y "lanza" la tinta: las gotas K, C, Y, M vuelan en arco, se estiran con la velocidad y aterrizan con un rebote. | Latigazo y cuatro gotas de agua al aterrizar, más un golpe grave. |
| 2.55–3.25 s | Un brillo recorre las letras; luego el logo queda fijo con un leve empuje de cámara. | Destello y acorde Re mayor 9 que resuelve. |

```bash
python3 logo-anim/trace_logo.py   # solo si cambia el logo de origen → logo-anim/logo.json
logo-anim/build.sh                # las 3 versiones (≈30 s)
```

## Idea

> "Esto no es solo un taller. Es donde una idea se vuelve una pieza real, con precisión milimétrica."

Tres ideas rectoras: **precisión, variedad, confianza**. Nada de listas: cada capacidad aparece como
un gesto físico (un corte que se separa, una foto que se graba, un aviso que se enciende).

**Hilo narrativo.** El mandala que el láser traza en el gancho reaparece al final como una pieza terminada
en acrílico: la idea del primer plano se vuelve objeto en el último. En medio, un cliente ficticio
—**Origen, café de montaña**— recorre los servicios (archivo, posavasos, pendón, vinilo, aviso, llaveros, boceto)
para que el espectador vea el viaje completo de una marca dentro del taller.

**Marca.** El wordmark "Plott INK" se recreó en vector a partir del logo original (`brand/logo-original.png`)
y se adaptó a fondo oscuro: letras claras con el filete interior del original. El láser recorta el contorno
real de cada letra y las cuatro gotas **CMYK** del logo caen al final. Las gotas son el acento de color de toda la
pieza: marcan los capítulos (01 cian, 02 magenta, 03 amarillo), los pasos del proceso y el cierre. El arcoíris
del logo aparece como la gráfica del pendón de gran formato.

## Guion técnico — máster 94 s

| Tiempo | Escena | Imagen | Texto en pantalla | Sonido |
|---|---|---|---|---|
| 0:00–0:07 | **Gancho** | Negro. Un punto de luz aparece sobre acrílico humo, en macro extremo y con poca profundidad de campo. Traza una línea, que se vuelve contorno y luego un mandala dibujado a velocidad imposible. Chispas y bokeh; la cámara sube hasta quedar cenital. Formato cinemascope 2.39:1. | — | Casi silencio → "tic" del encendido → motores paso a paso que "cantan" más agudo a medida que acelera + siseo de aire + chispas. |
| 0:07–0:11.5 | **Congelado** | Todo se detiene: las chispas quedan suspendidas en el aire, el enfoque se abre y la imagen se oscurece. | "¿Y si tu idea pudiera existir *mañana?*" | Corte seco a silencio, un golpe grave y una sola nota de piano. |
| 0:11.5–0:16.5 | **Logo** | El láser recorta el contorno de "Plott INK" letra por letra; cada letra se libera con brasa en el borde. Caen las gotas CMYK. Se abren las franjas del cinemascope. | CENTRO DE SERVICIOS GRÁFICOS · CORTE Y GRABADO LÁSER | Motores + chispas → impacto grave. Entra la música (Re mayor, 96 BPM). |
| 0:16.5–0:24 | **Posicionamiento** | Un archivo vectorial (nodos, cota Ø 90 mm) se materializa en un posavasos de madera grabado; la cámara se aleja y revela cientos de piezas iguales sobre la cama de panal. | "Del archivo…" → "…a la pieza *real.*" → "Una pieza. *O mil.*" | Interfaz, soplo al materializar, clics rítmicos al multiplicarse. |
| 0:24–0:30.25 | **01 Corte** | Macro cenital: primero las perforaciones internas y después el contorno, como se trabaja en taller. La pieza se levanta con el canto pulido brillando. Una lupa muestra la separación del corte. | **0.1 mm** · PRECISIÓN DE CORTE | Láser, chispas, "clac" del acrílico al separarse. Entra el arpegio. |
| 0:30.25–0:35.25 | **01 Grabado** | Una foto tramada del Valle de Cocora se graba línea por línea en arce; después una luz rasante revela el relieve. | "Grabado que se puede *tocar.*" | Vaivén del cabezal en modo raster. |
| 0:35.25–0:41.5 | **01 Materiales** | Travelling por fichas grabadas en acrílico, MDF, cuero, vidrio, metal y madera, que termina en un muestrario de 36 colores y acabados. | ACRÍLICO / MDF / … · "*+30* materiales." | Un golpe distinto por material (tic, golpe seco, palmada, "ting" de vidrio, resonancia metálica, nudillo en madera). |
| 0:41.5–0:46.5 | **02 Gran formato** | Un pendón sube desde su base con la gráfica arcoíris y se refleja en el piso del estudio. | "Color fiel, a *gran escala.*" | Resorte, trinquete y un "snap" al quedar fijo. |
| 0:46.5–0:50.25 | **02 Vinilo** | Una espátula asienta el vinilo en una vitrina y la cinta de transferencia se despega en diagonal. | "Vinilos que *visten* tu marca." | Fricción de la espátula y la cinta al despegarse. |
| 0:50.25–0:55.25 | **03 Aviso luminoso** | Fachada al anochecer: letras corpóreas que se encienden una a una con parpadeo y un halo cálido sobre el muro. | "Tu marca, *encendida.*" | Ciudad lejana, relés y el zumbido de 60 Hz de la red colombiana. |
| 0:55.25–1:00.25 | **03 Souvenirs** | Plano cenital: caja de boda, mug, llaveros, placa-trofeo, libreta de cuero y bolígrafo se posan en orden; el láser escribe los nombres. | "Con nombre *propio.*" | Apoyos sobre tela, cerámica, argollas. |
| 1:00.25–1:05.25 | **Diseño** | Un boceto a lápiz se vectoriza: el trazo tembloroso se vuelve geometría, aparecen los nodos y una trayectoria láser punteada la recorre. | "¿No tienes el arte? *Lo creamos.*" · LISTO PARA CORTE | Lápiz, clics de nodos y un paso del láser. |
| 1:05.25–1:17.75 | **Proceso** | Riel de 4 pasos con gotas CMYK: chat de WhatsApp → cotización con sello "ARTE APROBADO" → cama con 40 llaveros grabados en secuencia → verificación pieza por pieza y rutas de envío desde Bogotá sobre el mapa de Colombia. | 01–04 + "ENTREGA 24–72 H EN TRABAJOS PEQUEÑOS", "ENVÍOS A TODO EL PAÍS" → **"Cotización sin costo. Respuesta en *24 horas.*"** | Notificaciones, sello, láser, checks, caja, rutas. Clímax musical con bombo suave. |
| 1:17.75–1:22.75 | **Pieza final** | El mandala del inicio, ahora como disco de acrílico terminado, recibe una luz suave que lo barre; polvo flotando en el haz. | "Convertimos tus ideas en piezas *reales.*" | Baja la intensidad: solo pad y piano. |
| 1:22.75–1:34 | **Logo + CTA** | Wordmark y gotas; una línea láser separa el logo del llamado a la acción. Fundido a negro. | **Cotiza por WhatsApp · 301 630 0242** · **@plottink.co · www.plottink.co** | Acorde de resolución en Re y cola de reverberación. |

**Reels 45 s:** se quitan vinilo y diseño; el resto se comprime (gancho 7 s, logo 2.5 s, capacidades de 2.5 a 3.75 s cada una, proceso 7.5 s, CTA 5.5 s).
**Reels 30 s:** gancho 5 s, logo, corte, grabado, materiales, aviso, souvenirs; el proceso se reduce al chat y la frase de confianza; el CTA dura 5.75 s.

Cifras usadas (solo las reales): **0.1 mm**, **+30 materiales**, **respuesta en 24 horas**, **24–72 h en trabajos pequeños**, **cotización sin costo**, **envíos a todo el país**.
Los demás números en pantalla (Ø 90 mm, N.º 0427, fechas de boda) son datos de utilería del cliente ficticio, no afirmaciones sobre PlottInk.

## Dirección visual y sonora

- **Paleta:** fondo `#0A0A0F`, luz láser ámbar/blanca como acento principal y CMYK del logo en dosis pequeñas.
- **Tipografía:** Instrument Serif para las frases (editorial, con cursivas de énfasis), Inter Tight para cifras y subtítulos, JetBrains Mono para etiquetas técnicas. Todas son libres (Google Fonts, OFL) y están incluidas en `fonts/`. Nunca hay más de una frase en pantalla a la vez.
- **Cámara:** macro con desenfoque real por profundidad (máscara de foco calculada a partir de la geometría), planos cenitales, pull-backs y push-ins lentos, rack focus en el congelado. Sin zooms bruscos.
- **Post:** bloom solo en elementos emisivos (láser, chispas, LED), grano de película que respeta los negros, viñeta y franjas cinemascope en el gancho (solo 16:9).
- **Sonido:** el láser es el protagonista: el tono de los motores paso a paso sigue la velocidad del cabezal que se ve en pantalla. Cada escena dispara sus efectos desde las mismas marcas de tiempo que la animación (`timeline.json`), así que los cortes caen sobre el sonido. La música (pad, piano, arpegio de pulsos, bajo y percusión suave) crece del logo al proceso y se retira en el cierre.

## Estructura

```
timeline.json        fuente única de verdad: cortes, duraciones, marcas por escena y cues de sonido
index.html           página que dibuja la película (?w=&h=&cut=&t=, o &play=1 para verla en vivo)
js/engine.js         motor: capas, bloom, grano, cámara 3D, tipografía animada, partículas deterministas
js/textures.js       texturas procedurales (madera, MDF, cuero, metal, concreto, papel, panal) y tramado
js/scenes-*.js       escenas
audio/sound.py       diseño sonoro + partitura + mezcla (numpy/scipy)
render.mjs           render cuadro a cuadro con Chromium headless (paralelo) + hojas de contacto
tools/encode.py      masterización de audio (−14 LUFS) y codificación H.264/AAC
tools/extract-*.mjs  preparación de datos: contornos del wordmark (opentype.js) y mapa de Colombia (Natural Earth)
brand/               logo original de referencia
docs/                storyboards (hojas de contacto) de cada formato
```

## Reconstruir

```bash
cd plottink-video
npm install                       # opentype.js, topojson-client, world-atlas (solo para tools/)
pip install numpy scipy imageio-ffmpeg
./build.sh                        # las 6 piezas → dist/
./build.sh c30 9x16               # una sola pieza
node render.mjs stills --cut full --fmt 16x9 --t 3,12.5,26   # cuadros sueltos → build/stills
node render.mjs sheet  --cut full --fmt 9x16 --every 1.5     # hoja de contacto
npx http-server . -o "/index.html?play=1&cut=c30&w=1080&h=1920"   # previsualización en vivo (sin audio)
```

En un equipo de 4 núcleos, el render de las 6 piezas tarda unos 10 minutos y la codificación otros 10.

## Personalizar

- **Colores de marca:** `palette` en `timeline.json` (`cyan`, `magenta`, `yellow`, `laser`, `bg`, …).
- **Duraciones y montaje:** `cuts.*.scenes` en `timeline.json`. Las animaciones y los efectos de sonido se escalan solos a la nueva duración.
- **Textos:** cada escena en `js/scenes-*.js` (buscar `phrase(` / `headline(`).
- **Logo:** si llega el archivo vectorial oficial (SVG/fuente), se reemplaza `glyphs.json` (ver `tools/extract-glyphs.mjs`) y el láser recortará los contornos oficiales.
- **Sonido:** niveles por efecto en `timeline.json` (`gain`) y mezcla general en `audio/sound.py` (`render()`).
