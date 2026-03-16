# Activar un número en Twilio para llamadas por WhatsApp (ALARA INSP)

Guía paso a paso para registrar un número de teléfono en Twilio como **WhatsApp sender** y activar **WhatsApp Business Calling** (llamadas de voz por WhatsApp), de modo que ALARA pueda iniciar entrevistas por WhatsApp usando el mismo flujo actual.  
**Preferencia: número de Panamá (+507)** cuando esté disponible en Twilio.

---

## Requisitos previos

- Cuenta Twilio **actualizada** (no solo trial). En [Twilio Console](https://console.twilio.com) → **Upgrade** o **Admin → Account billing → Upgrade account**.
- Acceso **administrador** a un **Meta Business Portfolio** (o poder crear uno durante el registro).
- Para **llamadas salientes (business-initiated)** por WhatsApp, Meta exige que la cuenta tenga un límite de al menos **2.000 conversaciones iniciadas por el negocio en 24 h**; eso normalmente requiere **verificación de negocio en Meta** (gratuita, distinta de Meta Verified).

**Restricciones de WhatsApp Business Calling (voz):**

- Llamadas **salientes** (negocio → cliente) **no** están disponibles desde números en: USA, Canadá, Egipto, Nigeria, Turquía, Vietnam.
- El **número del negocio** debe estar en un país soportado por la API de WhatsApp de Meta (p. ej. Panamá suele estar soportado; conviene confirmar en la consola al comprar/registrar).
- Referencia: [WhatsApp Business Calling – Twilio](https://www.twilio.com/docs/voice/whatsapp-business-calling).

---

## Parte 1: Obtener un número para WhatsApp

Tienes dos opciones: **número Twilio** o **número propio (no Twilio)**.

### Opción A: Número Twilio (recomendado si hay disponibilidad)

1. Entra en [Twilio Console](https://console.twilio.com) → **Phone Numbers** → **Manage** → **Buy a number**.
2. En **Country**, elige **Panama** (o el país que quieras; debe estar en la lista).
3. Si aparece **Voice** y/o **SMS**, márcalos según lo que vayas a usar (para WhatsApp necesitas poder recibir SMS o llamada para el OTP de verificación).
4. Busca y compra un número.  
   Si **no hay números en Panamá**, elige otro país soportado por WhatsApp (p. ej. otro de Latinoamérica) y úsalo como `TWILIO_FROM`; el flujo de ALARA es el mismo.
5. Anota el número en formato E.164 (ej: `+50761234567`). Este será tu **WhatsApp sender** y luego tu `TWILIO_FROM`.

### Opción B: Número propio (no Twilio)

- El número **no** debe estar registrado en WhatsApp/WhatsApp Business.
- Debe poder **recibir SMS o llamada de voz** para recibir el código de verificación de Meta.
- Si ya está en WhatsApp, hay que [eliminar la cuenta de WhatsApp](https://faq.whatsapp.com/2138577903196467) asociada a ese número antes de usarlo como sender en Twilio.

---

## Parte 2: Registrar el número como WhatsApp Sender (Self Sign-up)

1. En Twilio Console ve a **Messaging** → **Senders** → **WhatsApp Senders**  
   o abre: [WhatsApp Senders](https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders).
2. Clic en **Create new sender**.
3. **Paso 1 – Select a phone number**
   - Si compraste un número Twilio: selecciónalo y **Continue**.
   - Si usas número propio: elige **Non-Twilio phone number** y **Continue**.
4. **Paso 2 – Link WhatsApp Business Account**
   - Clic en **Continue with Facebook**. Se abre una ventana/pop-up de Meta.
   - **No cierres** la ventana de Twilio; completa todo en la misma sesión del navegador.
   - En el pop-up de Meta:
     - **Iniciar sesión en Facebook** (o continuar como tu usuario).
     - Revisa los permisos para que Twilio gestione tu WABA y haz clic en **Get started**.
5. **Información del negocio**
   - Crea un **nuevo Meta Business Portfolio** o selecciona uno existente.
   - Siguiente.
6. **WhatsApp Business Account (WABA)**
   - Crea una **nueva WABA** o elige la que ya uses con Twilio (en una misma cuenta Twilio solo puede haber una WABA).
   - No uses una WABA creada fuera de Twilio.
   - Siguiente.
7. **Perfil de WhatsApp Business**
   - **WhatsApp Business display name**: nombre que verán los clientes (debe cumplir [normas de Meta](https://www.facebook.com/business/help/757569725593362)).
   - **Category**: categoría del negocio (p. ej. seguros / servicios profesionales).
   - Opcional: descripción, sitio web.
   - Siguiente.
8. **Añadir número de teléfono**
   - **Add a new phone number** y pega el número (con código de país, ej: +50761234567).
   - **Método de verificación**:
     - **Twilio + SMS**: eliges “Text message”; el código aparece en la consola de Twilio (en la misma página del sender). Copias el código y lo pegas en el pop-up.
     - **Twilio + voz**: antes debes configurar el número para reenviar la llamada a un Twimlet de voicemail que te envíe el código por email (ver [docs Self Sign-up – Voice](https://www.twilio.com/docs/whatsapp/self-sign-up)); luego eliges “Phone call” y usas el código que te llegue por email.
     - **Número no Twilio**: eliges SMS o llamada según lo que pueda recibir ese número e introduces el código que te llegue.
   - Introduce el código y **Next**.
9. **Review Twilio’s access request**
   - Revisa los permisos y haz clic en **Confirm**.
10. Al confirmar, el pop-up se cierra y Twilio termina el registro (puede tardar unos minutos). Cuando aparezca el sender en la lista, ya tienes el **número activo para WhatsApp (mensajería)**.

Referencia completa: [Register WhatsApp senders using Self Sign-up](https://www.twilio.com/docs/whatsapp/self-sign-up).

---

## Parte 3: Verificación de negocio en Meta (para voz saliente)

Para poder usar **WhatsApp Business Calling** (llamadas salientes) con ese número, Meta suele exigir:

- Límite de al menos **2.000 conversaciones iniciadas por el negocio en 24 h**, lo que en la práctica implica **verificación de negocio en Meta**.

Pasos resumidos:

1. Entra en [Meta Business Suite](https://business.facebook.com) y en **Configuración de seguridad** (o [Cómo verificar tu negocio en Meta](https://www.facebook.com/business/help/2058515294227817)) inicia la **verificación de negocio**.
2. Completa el proceso (documentos, datos del negocio, etc.). Los plazos pueden ser de varios días según la región.
3. Cuando esté verificada la cuenta, en Twilio podrás activar la **configuración de voz** en el sender (siguiente parte).

---

## Parte 4: Activar WhatsApp Business Calling (voz) en el sender

Con el sender registrado (y, si aplica, con la verificación de negocio en Meta completada):

### 4.1 Crear una TwiML App para la voz

1. En Twilio Console: **Voice** → **Manage** → **TwiML Apps** → **Create new TwiML App**  
   o [TwiML Apps](https://www.twilio.com/console/voice/twiml/apps).
2. **Friendly Name**: p. ej. `ALARA WhatsApp Voice`.
3. **Voice Configuration**:
   - **Request URL**: la URL que usa ALARA para servir el TwiML de la entrevista (grabar + transcribir).  
     Debe ser la URL **pública** de tu backend, por ejemplo:  
     `https://TU-BACKEND.up.railway.app/api/webhooks/twilio/twiml/{{inspection_request_id}}`  
     En Twilio no puedes poner el `:id` dinámico en la TwiML App; Twilio usa esta URL como base. Para ALARA, tu backend ya genera la URL completa por solicitud (p. ej. `.../twiml/123`). Por tanto, en la TwiML App puedes poner una URL “plantilla” o la de un id fijo de prueba **solo para que Twilio acepte la config**; en la práctica, las llamadas que inicies por API (desde n8n) llevan su propia `Url` en cada request (la que devuelve tu backend por `twilio_twiml_url`), así que lo importante es que esa URL pública sea la que sirve el TwiML con `<Record>` y `transcribeCallback`.
   - Para que coincida con tu arquitectura: pon como **Request URL** la URL base de tu backend más la ruta del TwiML, por ejemplo:  
     `https://TU-BACKEND.up.railway.app/api/webhooks/twilio/twiml/1`  
     (el “1” puede ser un id de prueba; al iniciar cada llamada, tu backend ya indica a n8n la URL con el id real, y Twilio usará esa URL por llamada.)
4. **HTTP Method**: **POST** (recomendado).
5. Guarda la TwiML App y copia el **TwiML App SID** (empieza por `AP...`).

Si tu backend exige un `id` en la ruta, puedes crear una ruta alternativa que redirija o que sirva TwiML genérico; lo más simple es que la URL que pongas aquí sea una que tu backend acepte (por ejemplo con un id por defecto o la que ya uses en producción).

### 4.2 Asignar la TwiML App al WhatsApp Sender

1. Vuelve a **Messaging** → **Senders** → **WhatsApp Senders**.
2. Abre el sender que creaste (el número de Panamá o el que sea).
3. **Edit Sender** (o configuración del sender).
4. Busca la sección **Voice** / **Voice Endpoint Configuration** / **Programmable Voice**.
5. En **TwiML App** (o **Voice Application**), selecciona la TwiML App que creaste (p. ej. `ALARA WhatsApp Voice`).
6. Guarda los cambios.

Con esto, ese número queda activado para **WhatsApp Business Calling**: podrás iniciar llamadas de voz por WhatsApp usando ese número como `From` con prefijo `whatsapp:`.

Referencia: [Configure your sender for Programmable Voice](https://www.twilio.com/docs/voice/whatsapp-business-calling#configure-your-sender-for-programmable-voice).

---

## Parte 5: Configurar ALARA para usar ese número por WhatsApp

1. En el backend (variables de entorno en Railway o `.env`):
   - **TWILIO_FROM** = número en E.164, p. ej. `+50761234567` (el mismo que registraste como WhatsApp sender).
   - **TWILIO_USE_WHATSAPP** = `true` (o `1`).
   - El resto (Twilio Account SID, Auth Token, URLs de n8n, etc.) igual que para llamadas normales.
2. Redeploy del backend si cambiaste variables.
3. En n8n no hace falta cambiar el workflow: el backend ya envía `twilio_from` y `client.phone` con prefijo `whatsapp:` cuando `TWILIO_USE_WHATSAPP` está en `true`.

---

## Resumen rápido

| Paso | Dónde | Acción |
|-----|--------|--------|
| 1 | Twilio Console | Comprar número (Panamá si hay) o preparar número propio. |
| 2 | Twilio → WhatsApp Senders | Create new sender → Self Sign-up con Meta (WABA, perfil, verificación OTP del número). |
| 3 | Meta Business | Completar verificación de negocio (para habilitar voz saliente). |
| 4 | Twilio → Voice → TwiML Apps | Crear TwiML App con Request URL = URL de tu backend que sirve TwiML (ej. `.../twiml/1`). |
| 5 | Twilio → WhatsApp Senders | En el sender, Voice Configuration → asignar esa TwiML App. |
| 6 | Backend ALARA | `TWILIO_FROM=+507...`, `TWILIO_USE_WHATSAPP=true`. |

---

## Nota sobre Panamá

Twilio y Meta pueden tener disponibilidad limitada de números o de registro según el país. Si en **Buy a number** no aparece Panamá o no hay stock:

- Usa un número de otro país soportado (p. ej. México, Colombia, Brasil, etc.) y configúralo como `TWILIO_FROM` con `TWILIO_USE_WHATSAPP=true`.
- El flujo de ALARA (iniciar llamada, grabar, transcribir, guardar reporte) es el mismo; solo cambia el número de origen y que la llamada sea por WhatsApp en lugar de PSTN.

Si quieres, en un siguiente paso se puede revisar la URL exacta que debes poner en la TwiML App según cómo esté expuesta la ruta de TwiML en tu backend (Railway).
