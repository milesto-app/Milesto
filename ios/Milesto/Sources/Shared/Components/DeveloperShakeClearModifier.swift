#if DEBUG
    import SwiftUI
    import UIKit

    struct DeveloperShakeClearModifier: ViewModifier {
        let developerSettings: DeveloperSettings

        func body(content: Content) -> some View {
            content
                .background(
                    DeveloperShakeDetector {
                        developerSettings.clearRouteOverride()
                    }
                    .allowsHitTesting(false)
                )
        }
    }

    private struct DeveloperShakeDetector: UIViewControllerRepresentable {
        let onShake: () -> Void

        func makeUIViewController(context _: Context) -> ShakeViewController {
            ShakeViewController(onShake: onShake)
        }

        func updateUIViewController(_ uiViewController: ShakeViewController, context _: Context) {
            uiViewController.onShake = onShake
            uiViewController.becomeFirstResponder()
        }
    }

    final class ShakeViewController: UIViewController {
        var onShake: () -> Void

        init(onShake: @escaping () -> Void) {
            self.onShake = onShake
            super.init(nibName: nil, bundle: nil)
        }

        @available(*, unavailable)
        required init?(coder _: NSCoder) {
            nil
        }

        override var canBecomeFirstResponder: Bool {
            true
        }

        override func viewDidAppear(_ animated: Bool) {
            super.viewDidAppear(animated)
            becomeFirstResponder()
        }

        override func motionEnded(_ motion: UIEvent.EventSubtype, with _: UIEvent?) {
            guard motion == .motionShake else { return }
            onShake()
        }
    }

    extension View {
        func clearsDeveloperOverrideOnShake(_ developerSettings: DeveloperSettings) -> some View {
            modifier(DeveloperShakeClearModifier(developerSettings: developerSettings))
        }
    }
#endif
