"use client";

import { useSyncExternalStore } from "react";
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
  "scan.ble.web": "Shinno Lights looks for nearby lighting devices. Chrome asks once when you add a new one.",
  "scan.ble.none": "This browser cannot use Bluetooth. Open Chrome on a computer, or the iPhone app.",
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
  "settings.autoConnectHint": "Link as soon as a device is added, and again next time you open the app.",
  "settings.remember": "Remember devices",
  "settings.rememberHint": "Keep names, colors, and last link after you close the app.",
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
  "howto.body":
    "1. Power the lighting devices on the car.\n2. Open Scan and add each device (Chrome asks you to pick it; the iPhone app finds them nearby).\n3. Name it Emblem, Mirrors, or Bumper on Devices.\n4. Tap a zone to control only that kit, or leave All lights selected.\n5. Color sets a solid RGB. Modes run the lighting animations. Speed 0 is slow, 100 is fast.\n6. Remove a device anytime from Devices.",
  "privacy.title": "Privacy policy",
  "privacy.body":
    "Shinno Lights is provided by Shin No Performance LLC. The app talks to your lighting devices over Bluetooth on this phone or computer. Pairing names, colors, and settings stay in local storage. We do not create an account, do not upload garage data, and do not sell information. Feedback sent to support@shinnoperformance.com is only used to improve the app.",
  "terms.title": "User agreement",
  "terms.body":
    "This app is a controller for Shinno RGB kits you already own. It is provided by Shin No Performance LLC. You are responsible for using lights in a way that is legal and safe for driving. Hardware pairing requires a supported browser or the iOS app. The app is provided as-is.",
  "updates.title": "Updates",
  "updates.current": "This build is current.",
  "updates.body": "You are running Shinno Lights {version}. New versions ship with the app update or TestFlight build.",
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
  "scan.ble.web": "Shinno Lights busca dispositivos de iluminación cercanos. Chrome pregunta una vez al añadir uno nuevo.",
  "scan.ble.none": "Este navegador no puede usar Bluetooth. Abre Chrome en una computadora o la app de iPhone.",
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
  "settings.autoConnectHint": "Enlaza al añadir un dispositivo y de nuevo al abrir la app.",
  "settings.remember": "Recordar dispositivos",
  "settings.rememberHint": "Conserva nombres, colores y el último enlace al cerrar la app.",
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
    "1. Enciende los dispositivos de iluminación del auto.\n2. Abre Buscar y añade cada dispositivo (Chrome te pide elegirlo; la app de iPhone los encuentra cerca).\n3. Nómbralo Emblema, Espejos o Parachoques en Dispositivos.\n4. Toca una zona para controlarla sola, o deja Todas las luces.\n5. Color fija un RGB. Los modos son las animaciones. Velocidad 0 es lento, 100 es rápido.\n6. Quita un dispositivo cuando quieras en Dispositivos.",
  "privacy.title": "Política de privacidad",
  "privacy.body":
    "Shinno Lights lo ofrece Shin No Performance LLC. La app habla con tus dispositivos de iluminación por Bluetooth en este teléfono o computadora. Nombres, colores y ajustes quedan en el almacenamiento local. No creamos cuenta, no subimos el garaje y no vendemos datos. Los comentarios a support@shinnoperformance.com solo se usan para mejorar la app.",
  "terms.title": "Acuerdo de usuario",
  "terms.body":
    "Esta app controla kits RGB Shinno que ya tienes. La ofrece Shin No Performance LLC. Tú eres responsable de usar las luces de forma legal y segura al conducir. El emparejado requiere un navegador compatible o la app iOS. La app se ofrece tal cual.",
  "updates.title": "Actualizaciones",
  "updates.current": "Esta versión está al día.",
  "updates.body": "Estás usando Shinno Lights {version}. Las versiones nuevas llegan con la actualización o TestFlight.",
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
