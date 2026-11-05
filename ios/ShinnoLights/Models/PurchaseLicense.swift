import Foundation

/// Confirms a paid Shopify order before the garage unlocks.
enum PurchaseLicense {
    private static let unlockedKey = "shinno.license.unlocked"
    private static let orderKey = "shinno.license.order"
    private static let emailKey = "shinno.license.email"

    /// Hosted Next.js `/api/verify-purchase` (must use HTTPS in production).
    /// Override at build time with SHINNO_LICENSE_API if needed.
    static var verifyURL: URL {
        if let raw = Bundle.main.object(forInfoDictionaryKey: "ShinnoLicenseAPIURL") as? String,
           let url = URL(string: raw), !raw.isEmpty
        {
            return url
        }
        return URL(string: "https://shinnoperformance.com/api/verify-purchase")!
    }

    static var isUnlocked: Bool {
        UserDefaults.standard.bool(forKey: unlockedKey)
    }

    static var orderName: String {
        UserDefaults.standard.string(forKey: orderKey) ?? ""
    }

    static var email: String {
        UserDefaults.standard.string(forKey: emailKey) ?? ""
    }

    static func save(orderName: String, email: String) {
        let defaults = UserDefaults.standard
        defaults.set(true, forKey: unlockedKey)
        defaults.set(orderName, forKey: orderKey)
        defaults.set(email, forKey: emailKey)
    }

    static func clear() {
        let defaults = UserDefaults.standard
        defaults.removeObject(forKey: unlockedKey)
        defaults.removeObject(forKey: orderKey)
        defaults.removeObject(forKey: emailKey)
    }

    struct VerifyResult {
        let ok: Bool
        let orderName: String?
        let email: String?
        let error: String?
    }

    static func verify(orderNumber: String, email: String) async -> VerifyResult {
        var request = URLRequest(url: verifyURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: [
            "orderNumber": orderNumber,
            "email": email,
        ])

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            let code = (response as? HTTPURLResponse)?.statusCode ?? 0
            let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
            let ok = (json?["ok"] as? Bool) == true
            if ok {
                return VerifyResult(
                    ok: true,
                    orderName: json?["orderName"] as? String ?? orderNumber,
                    email: json?["email"] as? String ?? email,
                    error: nil
                )
            }
            let message = (json?["error"] as? String)
                ?? (code == 0 ? "Could not reach the unlock service." : "Could not verify that order.")
            return VerifyResult(ok: false, orderName: nil, email: nil, error: message)
        } catch {
            return VerifyResult(ok: false, orderName: nil, email: nil, error: "Could not reach the unlock service.")
        }
    }
}
