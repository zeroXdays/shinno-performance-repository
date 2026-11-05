import SwiftUI

/// TEMP: lock screen off — set to `true` to require Shopify unlock again.
private let purchaseGateEnabled = false

struct PurchaseGateView<Content: View>: View {
    @AppStorage("shinno.license.unlocked") private var unlocked = false
    @ViewBuilder var content: () -> Content

    var body: some View {
        Group {
            // TEMP: skip unlock UI while purchaseGateEnabled is false.
            if !purchaseGateEnabled || unlocked {
                content()
            } else {
                UnlockForm()
            }
        }
    }
}

private struct UnlockForm: View {
    @AppStorage("shinno.license.unlocked") private var unlocked = false
    @State private var orderNumber = ""
    @State private var email = ""
    @State private var busy = false
    @State private var error: String?

    var body: some View {
        VStack(spacing: 24) {
            Spacer(minLength: 24)
            VStack(spacing: 10) {
                Text("SHINNO")
                    .font(.system(size: 22, weight: .semibold))
                    .tracking(4)
                Text("Unlock Shinno Sync")
                    .font(.title3.weight(.semibold))
                Text("Enter the Shopify order number and email from your Shinno kit purchase. Features unlock after we confirm a paid order.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 8)
            }

            VStack(alignment: .leading, spacing: 14) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("ORDER NUMBER")
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(.secondary)
                    TextField("1001", text: $orderNumber)
                        .keyboardType(.numberPad)
                        .textInputAutocapitalization(.never)
                        .padding(12)
                        .background(Color(white: 0.08), in: RoundedRectangle(cornerRadius: 12))
                }
                VStack(alignment: .leading, spacing: 6) {
                    Text("CHECKOUT EMAIL")
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(.secondary)
                    TextField("you@email.com", text: $email)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .padding(12)
                        .background(Color(white: 0.08), in: RoundedRectangle(cornerRadius: 12))
                }
                if let error {
                    Text(error)
                        .font(.footnote)
                        .foregroundStyle(Color.red.opacity(0.9))
                }
                Button {
                    Task { await submit() }
                } label: {
                    HStack {
                        if busy { ProgressView().tint(.white) }
                        Text("Unlock")
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                }
                .buttonStyle(.plain)
                .foregroundStyle(.white)
                .background(Color(red: 196 / 255, green: 18 / 255, blue: 32 / 255), in: RoundedRectangle(cornerRadius: 14))
                .disabled(busy)

                Text("Need help? Email \(LegalCopy.supportEmail)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity)
            }
            .padding(16)
            .background(Color(white: 0.07), in: RoundedRectangle(cornerRadius: 20))

            Spacer()
        }
        .padding(20)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black.ignoresSafeArea())
    }

    private func submit() async {
        busy = true
        error = nil
        let result = await PurchaseLicense.verify(orderNumber: orderNumber, email: email)
        busy = false
        if result.ok, let order = result.orderName, let mail = result.email {
            PurchaseLicense.save(orderName: order, email: mail)
            unlocked = true
        } else {
            error = result.error ?? "Could not verify that order."
        }
    }
}
