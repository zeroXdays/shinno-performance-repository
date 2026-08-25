import SwiftUI
import UIKit

struct SettingsView: View {
    @EnvironmentObject var garage: GarageStore
    @Environment(\.dismiss) private var dismiss
    @State private var feedback = ""

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Text("Bluetooth")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .textCase(.uppercase)
                    Toggle(isOn: $garage.settings.autoAdd) {
                        settingLabel(
                            "Add devices automatically",
                            "Nearby lighting devices join the garage when Scan finds them."
                        )
                    }
                    Toggle(isOn: $garage.settings.autoConnect) {
                        settingLabel(
                            "Connect automatically",
                            "Link saved devices when you open the app."
                        )
                    }
                    Toggle(isOn: $garage.settings.rememberDevices) {
                        settingLabel(
                            "Remember devices",
                            "Keep names, colors, and last link after you close the app."
                        )
                    }
                }

                Section("Help") {
                    NavigationLink(LegalCopy.howToTitle) {
                        LegalDocumentView(title: LegalCopy.howToTitle, bodyText: LegalCopy.howToBody)
                    }
                    NavigationLink(LegalCopy.privacyTitle) {
                        LegalDocumentView(title: LegalCopy.privacyTitle, bodyText: LegalCopy.privacyBody)
                    }
                    NavigationLink(LegalCopy.termsTitle) {
                        LegalDocumentView(title: LegalCopy.termsTitle, bodyText: LegalCopy.termsBody)
                    }
                    NavigationLink(LegalCopy.updatesTitle) {
                        LegalDocumentView(title: LegalCopy.updatesTitle, bodyText: LegalCopy.updatesBody)
                    }
                    NavigationLink("Feedback") {
                        FeedbackView(message: $feedback)
                    }
                    Link("Website", destination: LegalCopy.siteURL)
                    Link("Email support", destination: LegalCopy.supportMailto)
                }

                Section {
                    LabeledContent("Version", value: "\(LegalCopy.version) (\(LegalCopy.build))")
                    Text(LegalCopy.legalName)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Settings")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }

    private func settingLabel(_ title: String, _ hint: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
            Text(hint)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }
}

struct LegalDocumentView: View {
    let title: String
    let bodyText: String

    var body: some View {
        ScrollView {
            Text(bodyText)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding()
                .textSelection(.enabled)
        }
        .background(Color.black)
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct FeedbackView: View {
    @Binding var message: String
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("What should we fix or add?")
                .foregroundStyle(.secondary)
            TextEditor(text: $message)
                .frame(minHeight: 140)
                .padding(8)
                .background(Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 12))
            Button("Send email") {
                let body = message.trimmingCharacters(in: .whitespacesAndNewlines)
                let text = body.isEmpty ? "What should we fix or add?" : body
                var comps = URLComponents()
                comps.scheme = "mailto"
                comps.path = LegalCopy.supportEmail
                comps.queryItems = [
                    URLQueryItem(name: "subject", value: LegalCopy.feedbackSubject),
                    URLQueryItem(name: "body", value: text),
                ]
                if let url = comps.url {
                    UIApplication.shared.open(url)
                }
                dismiss()
            }
            .buttonStyle(.borderedProminent)
            .tint(Color(red: 0.88, green: 0.02, blue: 0))
            Spacer()
        }
        .padding()
        .navigationTitle("Feedback")
        .navigationBarTitleDisplayMode(.inline)
    }
}
