# Copia de seguridad: tienda Jolgorio ("Mi tienda 3")

Fecha: 7 de octubre de 2026
Tienda original: `pue1f9-he.myshopify.com` (plan Basic, EUR, España)

## Qué hay en esta carpeta

| Archivo | Contenido |
|---|---|
| `productos-shopify-import.csv` | Los 14 productos en el formato oficial de Shopify. Se importa en la tienda nueva desde **Productos → Importar**. |
| `products.json` | Copia completa de los productos: títulos, descripciones, etiquetas, variantes, SKU, precios, precios tachados y fotos con su texto alternativo. |
| `store-structure.json` | Colecciones y sus reglas, páginas y menús. |

## Resumen de la tienda

- **Marca:** Jolgorio (decoración de Halloween, Navidad y fiestas)
- **Productos:** 14 (10 activos y 4 archivados). Todos con SKU de AliExpress (`ALI-…`), precio y precio tachado.
- **Colecciones (8):** Página de inicio, Halloween, Navidad, Cumpleaños, Iluminación, Decoración, Proyectores y Guirnaldas. Salvo "Página de inicio", todas son automáticas por etiqueta.
- **Páginas:** Contacto (vacía).
- **Menús:** principal (Inicio, Catálogo, Contacto) y pie de página (Buscar).
- **No se guardó:** pedidos, clientes, tema ni ajustes de pago y envío. La tienda no tenía nada de eso que mereciera copia.

## Importante sobre las fotos

Las fotos siguen alojadas en la tienda antigua. Los enlaces están en el CSV y en `products.json`.

**Importa el CSV en la tienda nueva antes de borrar o cerrar la tienda antigua.** Al importarlo, Shopify copia cada foto a la tienda nueva. Si borras primero la antigua, los enlaces dejarán de funcionar y los productos se quedarán sin fotos.

## Cómo recrear las colecciones automáticas

En la tienda nueva: **Productos → Colecciones → Crear colección → Automatizada**, con la condición "Etiqueta del producto es igual a…":

- Halloween → `halloween`
- Navidad → `navidad`
- Cumpleaños → `cumpleanos`
- Iluminación → `iluminacion`
- Proyectores → `proyector`
- Guirnaldas → `guirnalda`
- Decoración → cualquiera de: `decoracion`, `globos`, `proyector`, `guirnalda`
