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
  "stage.hint": "tap a zone",
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
  "demo.lights": "Demo lights",
  "scan.demo": "Demo scan",
  "scan.pair": "Pair",
  "scan.ble.web": "Looks for ELK / MELK boxes nearby.",
  "scan.ble.none": "Live Bluetooth needs the iPhone app. Chrome can pair a box from this page.",
  "scan.empty": "Nothing yet.",
  "scan.added": "Added",
  "scan.add": "Add",
  "scan.demoTag": "Demo",
  "scan.btTag": "Bluetooth",
  "devices.empty": "No devices. Scan or load demo lights.",
  "devices.clear": "Clear",
  "devices.remove": "Remove",
  "devices.connect": "Connect",
  "devices.disconnect": "Disconnect",
  "devices.rename": "Name",
  "effects.speed": "Speed",
  "effects.fast": "0 fast",
  "effects.slow": "100 slow",
  "effects.search": "Search Auto Play, curtain, water…",
  "effects.none": "No modes match.",
  "effects.pick": "Pick a mode",
  "effects.path": "The path shows how the animation moves.",
  "connection.connected": "Connected",
  "connection.disconnected": "Disconnected",
  "connection.connecting": "Connecting",
  "connection.error": "Error",
  "settings.title": "Settings",
  "settings.bluetooth": "Bluetooth",
  "settings.autoAdd": "Auto-add devices",
  "settings.autoAddHint": "When a box appears in Scan, add it to the garage.",
  "settings.autoConnect": "Auto-connect",
  "settings.autoConnectHint": "Connect as soon as a box is added.",
  "settings.remember": "Remember connect state",
  "settings.rememberHint": "Keep last linked boxes after refresh.",
  "settings.manual": "Manual connect",
  "settings.manualHint": "Use Connect on each device when auto-connect is off.",
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
    "1. Power the devices on the car.\n2. Open Scan and tap Pair (Chrome) or scan in the iPhone app.\n3. Add each box and name it Emblem, Mirrors, or Bumper.\n4. Tap a zone tile to control only that kit, or leave All lights selected.\n5. Color sets a solid RGB. Modes run Lotus Lamp X animations. Speed 0 is fast, 100 is slow.\n6. Remove a box anytime from Devices.",
  "privacy.title": "Privacy policy",
  "privacy.body":
    "Shinno Lights talks to your LED boxes over Bluetooth on this device. Pairing names, colors, and settings stay in local storage. We do not create an account, do not upload garage data, and do not sell information. Feedback you send by email is only used to improve the app.",
  "terms.title": "User agreement",
  "terms.body":
    "This app is a controller for Shinno RGB kits that ship with ELK-family boxes. You are responsible for using lights in a way that is legal and safe for driving. Demo mode is simulated. Hardware pairing requires a supported browser or the iOS app. Shinno Performance provides the app as-is for controlling products you already own.",
  "updates.title": "Updates",
  "updates.current": "This build is current.",
  "updates.body": "You are running Shinno Lights {version}. New versions ship with the git checkout or TestFlight build.",
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
  "stage.hint": "toca una zona",
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
  "demo.lights": "Luces de demo",
  "scan.demo": "Buscar demo",
  "scan.pair": "Emparejar",
  "scan.ble.web": "Busca cajas ELK / MELK cercanas.",
  "scan.ble.none": "Bluetooth en vivo necesita la app de iPhone. Chrome puede emparejar desde esta página.",
  "scan.empty": "Aún nada.",
  "scan.added": "Añadido",
  "scan.add": "Añadir",
  "scan.demoTag": "Demo",
  "scan.btTag": "Bluetooth",
  "devices.empty": "Sin dispositivos. Busca o carga luces de demo.",
  "devices.clear": "Vaciar",
  "devices.remove": "Quitar",
  "devices.connect": "Conectar",
  "devices.disconnect": "Desconectar",
  "devices.rename": "Nombre",
  "effects.speed": "Velocidad",
  "effects.fast": "0 rápido",
  "effects.slow": "100 lento",
  "effects.search": "Buscar Auto Play, cortina, agua…",
  "effects.none": "Ningún modo coincide.",
  "effects.pick": "Elige un modo",
  "effects.path": "La ruta muestra cómo se mueve la animación.",
  "connection.connected": "Conectado",
  "connection.disconnected": "Desconectado",
  "connection.connecting": "Conectando",
  "connection.error": "Error",
  "settings.title": "Ajustes",
  "settings.bluetooth": "Bluetooth",
  "settings.autoAdd": "Añadir dispositivos al detectar",
  "settings.autoAddHint": "Si aparece una caja en Buscar, se añade al garaje.",
  "settings.autoConnect": "Conectar automático",
  "settings.autoConnectHint": "Conecta en cuanto se añade una caja.",
  "settings.remember": "Recordar conexión",
  "settings.rememberHint": "Conserva las cajas enlazadas al recargar.",
  "settings.manual": "Conexión manual",
  "settings.manualHint": "Usa Conectar en cada dispositivo si el automático está apagado.",
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
    "1. Enciende los dispositivos del auto.\n2. Abre Buscar y toca Emparejar (Chrome) o busca en la app de iPhone.\n3. Añade cada caja y nómbrala Emblema, Espejos o Parachoques.\n4. Toca una zona para controlarla sola, o deja Todas las luces.\n5. Color fija un RGB. Los modos son animaciones Lotus Lamp X. Velocidad 0 es rápido, 100 es lento.\n6. Quita una caja cuando quieras en Dispositivos.",
  "privacy.title": "Política de privacidad",
  "privacy.body":
    "Shinno Lights habla con tus cajas LED por Bluetooth en este dispositivo. Nombres, colores y ajustes quedan en el almacenamiento local. No creamos cuenta, no subimos el garaje y no vendemos datos. Los comentarios que envíes por correo solo se usan para mejorar la app.",
  "terms.title": "Acuerdo de usuario",
  "terms.body":
    "Esta app controla kits RGB Shinno que incluyen cajas de la familia ELK. Tú eres responsable de usar las luces de forma legal y segura al conducir. El modo demo es simulado. El emparejado real requiere un navegador compatible o la app iOS. Shinno Performance ofrece la app tal cual para productos que ya tienes.",
  "updates.title": "Actualizaciones",
  "updates.current": "Esta versión está al día.",
  "updates.body": "Estás usando Shinno Lights {version}. Las versiones nuevas llegan con el repositorio o TestFlight.",
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
