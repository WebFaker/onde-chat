import SwiftUI
import WebKit

@main
struct OndeApp: App {
    var body: some Scene {
        WindowGroup { OndeView().preferredColorScheme(.dark) }
    }
}

struct OndeView: View {
    @State private var loading = true
    @State private var failed = false
    @State private var reload = UUID()

    var body: some View {
        ZStack {
            Color(red: 0.07, green: 0.08, blue: 0.11).ignoresSafeArea()
            OndeWebView(loading: $loading, failed: $failed).id(reload)
                .opacity(failed ? 0 : 1)
            if loading && !failed {
                VStack(spacing: 16) {
                    Text("Onde").font(.largeTitle.bold())
                    ProgressView().accessibilityLabel("Chargement d’Onde")
                }
                .padding(28).background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 20))
            }
            if failed {
                VStack(spacing: 18) {
                    Image(systemName: "wifi.exclamationmark").font(.largeTitle)
                    Text("Connexion à Onde impossible").font(.headline)
                    Text("Vérifiez votre connexion internet, puis réessayez.")
                        .multilineTextAlignment(.center)
                    Button("Réessayer") {
                        failed = false
                        loading = true
                        reload = UUID()
                    }.buttonStyle(.borderedProminent)
                }.padding(28)
            }
        }
    }
}

struct OndeWebView: UIViewRepresentable {
    @Binding var loading: Bool
    @Binding var failed: Bool
    private static let origin = "onde-chat.vercel.app"

    func makeCoordinator() -> Coordinator { Coordinator(parent: self) }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        // Persistent, isolated WebKit cookies preserve the existing secure login.
        config.websiteDataStore = .default()
        config.allowsInlineMediaPlayback = true
        let view = WKWebView(frame: .zero, configuration: config)
        view.navigationDelegate = context.coordinator
        view.uiDelegate = context.coordinator
        view.allowsBackForwardNavigationGestures = true
        view.isOpaque = false
        view.backgroundColor = .clear
        view.scrollView.backgroundColor = .clear
        view.load(URLRequest(url: URL(string: "https://\(Self.origin)/")!))
        return view
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        context.coordinator.parent = self
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        var parent: OndeWebView
        init(parent: OndeWebView) { self.parent = parent }

        private func trusted(_ url: URL) -> Bool {
            url.scheme == "https" && url.host == OndeWebView.origin && (url.port == nil || url.port == 443)
        }

        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = action.request.url else { decisionHandler(.cancel); return }
            if trusted(url) {
                if action.targetFrame == nil {
                    webView.load(action.request)
                    decisionHandler(.cancel)
                } else { decisionHandler(.allow) }
                return
            }
            // Only explicit user taps may open external HTTPS links in the browser.
            if action.navigationType == .linkActivated && url.scheme == "https" {
                UIApplication.shared.open(url)
            }
            decisionHandler(.cancel)
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            parent.loading = false
            parent.failed = false
        }
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            report(error)
        }
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            report(error)
        }
        private func report(_ error: Error) {
            guard (error as NSError).code != NSURLErrorCancelled else { return }
            parent.loading = false
            parent.failed = true
        }
        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            parent.loading = true
            webView.reload()
        }
        func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                     initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
            let alert = UIAlertController(title: "Onde", message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
            webView.window?.rootViewController?.present(alert, animated: true)
            if webView.window == nil { completionHandler() }
        }
    }
}
