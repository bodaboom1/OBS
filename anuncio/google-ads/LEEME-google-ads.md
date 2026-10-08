# Campaña de Google Ads de Lumifiesta (Búsqueda)

En esta carpeta hay 3 archivos listos para subir de golpe a tu campaña:

| Archivo | Qué contiene |
|---|---|
| `1-palabras-clave.csv` | 133 palabras clave repartidas en 10 grupos de anuncios (uno por producto), en concordancia de frase y exacta, con su CPC máximo y la URL del producto |
| `2-anuncios.csv` | 10 anuncios adaptables de búsqueda (uno por grupo): hasta 15 títulos y 4 descripciones cada uno, ya revisados con los límites de Google |
| `3-negativas.csv` | 39 palabras clave negativas para no pagar clics inútiles («gratis», «segunda mano», «manualidades», «aliexpress», «amazon»…) |

Todo lo que dicen los anuncios es real: precios actuales, envío gratis desde 25 €, devolución en 14 días, garantía de 3 años, −10 % llevando 2 y −15 % llevando 3, y el código HALLOWEEN15 (válido hasta el 31 de octubre). No hay descuentos inventados.

---

## 1. Antes de subir: pon el nombre exacto de tu campaña

En los tres archivos, la columna **Campaign** pone `Lumifiesta - Búsqueda`.

- Si tu campaña se llama exactamente así, no cambies nada.
- Si se llama de otra forma, abre cada CSV (con Excel o Google Sheets) y sustituye ese texto por el nombre exacto de tu campaña, con las mismas mayúsculas y tildes. Si no, Google intentará crear una campaña nueva. También puedes decirme el nombre y te los dejo cambiados.

## 2. Subirlos (gratis, desde la web de Google Ads)

1. Entra en ads.google.com y ve a **Herramientas** (icono de la llave) → **Acciones en bloque** → **Subidas**.
2. Pulsa **+** → **Seleccionar archivo** y sube `1-palabras-clave.csv`.
3. Pulsa **Vista previa**, revisa que no haya errores y luego **Aplicar**.
4. Repite con `2-anuncios.csv` y después con `3-negativas.csv`.

Los grupos de anuncios se crean solos con el nombre de cada producto.

Si prefieres Google Ads Editor (programa gratuito): **Cuenta → Importar → Desde archivo**, eliges cada CSV, revisas y pulsas **Publicar**.

## 3. Ajustes de la campaña (se ponen a mano, en Configuración)

| Ajuste | Qué poner | Por qué |
|---|---|---|
| Redes | Solo **Red de Búsqueda**. Quita «Red de Display» y «Socios de búsqueda» | Display gasta mucho con poco resultado en tiendas nuevas |
| Ubicación | **España** (opción «Presencia: personas que están en tus ubicaciones») | Los anuncios están en español y los plazos de entrega son los de España |
| Idioma | **Español** | |
| Puja | Al principio **Maximizar clics** con límite de CPC de **0,40 €**. Cuando tengas unas 15 ventas, cambia a **Maximizar conversiones** | Google necesita datos de ventas para optimizar |
| Presupuesto | Desde **5 €/día** | Con 0,20–0,40 € por clic son unos 15–25 clics al día |
| Horario | Todos los días. Si quieres ahorrar, de 9:00 a 0:00 | |

## 4. Extensiones (Recursos) para pegar a mano

**Enlaces de sitio** (Recursos → Enlaces de sitio):

| Texto (máx. 25) | Descripción 1 | Descripción 2 | URL |
|---|---|---|---|
| Decoración Halloween | Telarañas, luces y guirnaldas | −15 % con HALLOWEEN15 | `https://ypnmwd-as.myshopify.com/collections/halloween` |
| Decoración Navidad | Proyectores, ramas y luces | Pide antes del 3 de diciembre | `https://ypnmwd-as.myshopify.com/collections/navidad` |
| Regalos hasta 15 € | Detalles con luz para regalar | Envío gratis desde 25 € | `https://ypnmwd-as.myshopify.com/collections/regalos-por-menos-de-15` |
| Nuestros favoritos | Telaraña y Proyector Mágico | Los más elegidos de la tienda | `https://ypnmwd-as.myshopify.com/collections/mas-vendidos` |

**Textos destacados** (máx. 25 caracteres cada uno):
`Envío gratis desde 25 €` · `Devolución en 14 días` · `Garantía de 3 años` · `−15 % llevando 3` · `Pago 100 % seguro` · `Seguimiento del pedido`

**Fragmento estructurado**, con el encabezado «Tipos»:
`Telarañas LED` · `Proyectores` · `Guirnaldas` · `Ramas luminosas` · `Luces de hada`

## 5. Fechas importantes (no te las saltes)

- **11 de octubre: pausa los grupos «Telaraña LED Halloween», «Luces Halloween» y «Guirnalda Calabazas».** Con 8–15 días laborables de entrega, lo que se pida después del 10 de octubre ya no llega para Halloween, y los anuncios dicen «Pídela antes del 10/10». El código HALLOWEEN15 sigue valiendo hasta el 31, pero prometer la llegada a tiempo sería falso.
- **Del 11 de octubre en adelante**, mete el presupuesto en los grupos de **Navidad**: Proyector Nevada, Proyector Mágico, Ramas, Bolas de Nieve, Cinta y Micro Luces.
- **3 de diciembre:** último día para que llegue antes de Navidad. A partir del 4, cambia «Pídelo antes del 3/12» por otro título o pausa esos anuncios.

## 6. Medir las ventas (gratis)

En Shopify instala la app **Google & YouTube** (es de Google y es gratis), conecta tu cuenta de Google Ads y activa el **seguimiento de conversiones**. Sin esto, Google no sabe qué clics acaban en compra y no puede optimizar.

## 7. Qué mirar cada 2–3 días

| Dato | Bien | Si va mal |
|---|---|---|
| CTR | más del 4 % | Revisa los títulos de ese grupo |
| CPC medio | menos de 0,40 € | Baja el CPC máximo o pausa las palabras más caras |
| Términos de búsqueda | Que tengan que ver con tus productos | Añade como negativas las búsquedas que no tengan nada que ver |
