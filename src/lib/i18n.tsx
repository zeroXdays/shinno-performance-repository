"use client";

import { useSyncExternalStore } from "react";
import { HOWTO_BODY, PRIVACY_BODY, TERMS_BODY } from "./legal";
import { getSettings, getServerSettings, subscribeSettings, type LangId } from "./settings";

const EN: Record<string, string> = {
  "zone.emblem": "Emblem",
  "zone.mirrors": "Mirrors",
  "zone.bumper": "Bumper",
  "zone.grille": "Grille",
  "zone.custom": "Other",
  "stage.all": "All lights",
  "stage.hint": "Tap a zone",
  "stage.none": "Empty",
  "stage.off": "Off",
  "stage.mode": "Mode",
  "tab.color": "Color",
  "tab.effects": "Modes",
  "tab.scan": "Scan",
  "tab.devices": "Devices",
  "car.label": "Car",
  "car.soon": "soon",
  "power.on": "Turn on",
  "power.off": "Turn off",
  "color.brightness": "Brightness",
  "scan.pair": "Add a device",
  "scan.ble.web": "Shinno Lights looks for nearby lighting devices.",
  "scan.ble.none": "Turn Bluetooth on in Settings if this screen stays empty.",
  "scan.empty": "No new devices yet. Power the kits, then add a device.",
  "scan.added": "Added",
  "scan.add": "Add",
  "scan.btTag": "Bluetooth",
  "devices.empty": "No devices yet. Scan to add the lighting devices on your car.",
  "devices.clear": "Clear all",
  "devices.remove": "Remove",
  "devices.connect": "Connect",
  "devices.disconnect": "Disconnect",
  "devices.rename": "Name",
  "effects.speed": "Speed",
  "effects.slow": "Slow",
  "effects.fast": "Fast",
  "effects.search": "Search Auto Play, curtain, water…",
  "effects.none": "No modes match.",
  "effects.pick": "Pick a mode",
  "effects.path": "The path shows how the animation moves.",
  "home.scanCta": "Scan for devices",
  "connection.connected": "Connected",
  "connection.disconnected": "Disconnected",
  "connection.connecting": "Connecting",
  "connection.error": "Error",
  "settings.title": "Settings",
  "settings.bluetooth": "Bluetooth",
  "settings.autoAdd": "Add devices automatically",
  "settings.autoAddHint": "When you pick a nearby device, it joins the garage.",
  "settings.autoConnect": "Connect automatically",
  "settings.autoConnectHint": "When a saved device powers on, link again and restore the last color and mode.",
  "settings.remember": "Remember devices",
  "settings.rememberHint": "Keep names, colors, and reconnect those devices the next time they are on.",
  "settings.appearance": "Appearance",
  "settings.theme": "Theme",
  "settings.theme.night": "Night",
  "settings.theme.graphite": "Graphite",
  "settings.theme.studio": "Studio",
  "settings.language": "Language",
  "settings.language.system": "System",
  "settings.language.en": "English",
  "settings.language.es": "Español",
  "settings.help": "Help",
  "settings.howTo": "How to use",
  "settings.privacy": "Privacy policy",
  "settings.terms": "User agreement",
  "settings.updates": "Check for updates",
  "settings.feedback": "Feedback",
  "settings.version": "Version",
  "howto.title": "How to use Shinno Lights",
  "howto.body": HOWTO_BODY,
  "privacy.title": "Privacy policy",
  "privacy.body": PRIVACY_BODY,
  "terms.title": "User agreement",
  "terms.body": TERMS_BODY,
  "updates.title": "Updates",
  "updates.current": "This build is current.",
  "updates.body": "You are running Shinno Lights {version}. New versions ship as App Store updates.",
  "feedback.title": "Feedback",
  "feedback.placeholder": "What should we fix or add?",
  "feedback.send": "Send email",
  "feedback.cancel": "Cancel",
  "common.close": "Close",
  "common.on": "On",
  "common.off": "Off",
};

const ES: Record<string, string> = {
  "zone.emblem": "Emblema",
  "zone.mirrors": "Espejos",
  "zone.bumper": "Parachoques",
  "zone.grille": "Parrilla",
  "zone.custom": "Otro",
  "stage.all": "Todas las luces",
  "stage.hint": "Toca una zona",
  "stage.none": "Vacío",
  "stage.off": "Apagado",
  "stage.mode": "Modo",
  "tab.color": "Color",
  "tab.effects": "Modos",
  "tab.scan": "Buscar",
  "tab.devices": "Dispositivos",
  "car.label": "Auto",
  "car.soon": "pronto",
  "power.on": "Encender",
  "power.off": "Apagar",
  "color.brightness": "Brillo",
  "scan.pair": "Añadir un dispositivo",
  "scan.ble.web": "Shinno Lights busca dispositivos de iluminación cercanos.",
  "scan.ble.none": "Activa Bluetooth en Ajustes si esta pantalla permanece vacía.",
  "scan.empty": "Aún no hay dispositivos nuevos. Enciende los kits y añade un dispositivo.",
  "scan.added": "Añadido",
  "scan.add": "Añadir",
  "scan.btTag": "Bluetooth",
  "devices.empty": "Sin dispositivos. Busca para añadir los de iluminación de tu auto.",
  "devices.clear": "Vaciar todo",
  "devices.remove": "Quitar",
  "devices.connect": "Conectar",
  "devices.disconnect": "Desconectar",
  "devices.rename": "Nombre",
  "effects.speed": "Velocidad",
  "effects.slow": "Lento",
  "effects.fast": "Rápido",
  "effects.search": "Buscar Auto Play, cortina, agua…",
  "effects.none": "Ningún modo coincide.",
  "effects.pick": "Elige un modo",
  "effects.path": "La ruta muestra cómo se mueve la animación.",
  "home.scanCta": "Buscar dispositivos",
  "connection.connected": "Conectado",
  "connection.disconnected": "Desconectado",
  "connection.connecting": "Conectando",
  "connection.error": "Error",
  "settings.title": "Ajustes",
  "settings.bluetooth": "Bluetooth",
  "settings.autoAdd": "Añadir dispositivos automáticamente",
  "settings.autoAddHint": "Al elegir un dispositivo cercano, entra al garaje.",
  "settings.autoConnect": "Conectar automáticamente",
  "settings.autoConnectHint": "Cuando un dispositivo guardado se enciende, se enlaza de nuevo y restaura el último color y modo.",
  "settings.remember": "Recordar dispositivos",
  "settings.rememberHint": "Conserva nombres y colores, y vuelve a conectar esos dispositivos la próxima vez que estén encendidos.",
  "settings.appearance": "Apariencia",
  "settings.theme": "Tema",
  "settings.theme.night": "Noche",
  "settings.theme.graphite": "Grafito",
  "settings.theme.studio": "Estudio",
  "settings.language": "Idioma",
  "settings.language.system": "Sistema",
  "settings.language.en": "English",
  "settings.language.es": "Español",
  "settings.help": "Ayuda",
  "settings.howTo": "Cómo usar",
  "settings.privacy": "Política de privacidad",
  "settings.terms": "Acuerdo de usuario",
  "settings.updates": "Buscar actualizaciones",
  "settings.feedback": "Comentarios",
  "settings.version": "Versión",
  "howto.title": "Cómo usar Shinno Lights",
  "howto.body":
    "1. Enciende los dispositivos de iluminación que vinieron con tus kits RGB Shinno (emblema, espejos, parachoques).\n2. Activa Bluetooth. Shinno Lights busca de forma continua mientras Bluetooth está encendido y lista los dispositivos cercanos en Buscar.\n3. Abre Buscar y toca Añadir en cada dispositivo. Permite Bluetooth la primera vez que iOS lo pida.\n4. Después, Shinno Lights vuelve a conectar los dispositivos guardados cuando se encienden y restaura el último color y modo. No tienes que buscar de nuevo cada vez.\n5. Color fija un RGB para todas las luces o una zona. Los modos son las animaciones. Velocidad 0 es lento, 100 es rápido.\n6. Quita un dispositivo cuando quieras en Dispositivos.\n\nEsta app de iPhone habla con el hardware por Bluetooth. Usa las luces de forma legal y segura al conducir.",
  "privacy.title": "Política de privacidad",
  "privacy.body":
    "Shinno Lights lo ofrece Shin No Performance LLC. Esta política describe cómo la app de iPhone trata la información.\n\nQué hace la app\nShinno Lights controla por Bluetooth los kits RGB Shinno para Infiniti Q50: emblema, espejos y parachoques. Encuentra dispositivos de iluminación cercanos y envía color, brillo, encendido y modos por Bluetooth Low Energy. No hay cuenta ni tienda en la app.\n\nInformación en este iPhone\nNombres, identificadores Bluetooth de los dispositivos que añades, zonas, último color, brillo, encendido, modo y ajustes quedan en el almacenamiento del dispositivo (UserDefaults). Solo sirve para el garaje en este teléfono. No lo subimos. No creamos cuenta. No vendemos datos. No usamos analítica, publicidad ni rastreo. No pedimos ubicación precisa.\n\nBluetooth\nBluetooth se usa solo para descubrir, conectar y controlar los dispositivos de iluminación de los kits Shinno. No lo usamos para rastrearte.\n\nComentarios\nSi escribes a support@shinnoperformance.com, el mensaje y tu correo solo se usan para responder y mejorar el producto.\n\nContacto\nShin No Performance LLC\nsupport@shinnoperformance.com\nhttps://shinnoperformance.com\n\nLa política de privacidad dentro de la app es la referencia de esta versión.",
  "terms.title": "Acuerdo de usuario",
  "terms.body":
    "Shinno Lights controla kits RGB Shinno que ya tienes. Lo ofrece Shin No Performance LLC.\n\nTú eres responsable de usar las luces del auto de forma legal y segura al conducir. No uses luces intermitentes o de color de un modo que imite vehículos de emergencia o incumpla la ley local.\n\nLa app necesita un kit de iluminación Shinno físico y Bluetooth. Los kits Q50 de emblema, espejos y parachoques están soportados. Q60 y Q70 aparecen como pronto y no se pueden elegir. El distintivo de parrilla no está en esta versión.\n\nLa app se ofrece tal cual, sin garantías. El emparejado y el comportamiento dependen de los dispositivos que vinieron con tus kits.\n\nPreguntas: support@shinnoperformance.com",
  "updates.title": "Actualizaciones",
  "updates.current": "Esta versión está al día.",
  "updates.body": "Estás usando Shinno Lights {version}. Las versiones nuevas llegan como actualizaciones de App Store.",
  "feedback.title": "Comentarios",
  "feedback.placeholder": "¿Qué debemos corregir o añadir?",
  "feedback.send": "Enviar correo",
  "feedback.cancel": "Cancelar",
  "common.close": "Cerrar",
  "common.on": "Sí",
  "common.off": "No",
};

function systemLang(): "en" | "es" {
  if (typeof navigator === "undefined") return "en";
  return navigator.language.toLowerCase().startsWith("es") ? "es" : "en";
}

export function resolveLang(language: LangId): "en" | "es" {
  return language === "system" ? systemLang() : language;
}

export function translate(key: string, vars?: Record<string, string>) {
  const lang = resolveLang(getSettings().language);
  const table = lang === "es" ? ES : EN;
  let text = table[key] ?? EN[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, value);
    }
  }
  return text;
}

export function useI18n() {
  const settings = useSyncExternalStore(subscribeSettings, getSettings, getServerSettings);
  const lang = resolveLang(settings.language);
  return {
    lang,
    t: (key: string, vars?: Record<string, string>) => {
      const table = lang === "es" ? ES : EN;
      let text = table[key] ?? EN[key] ?? key;
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.replaceAll(`{${name}}`, value);
        }
      }
      return text;
    },
  };
}
