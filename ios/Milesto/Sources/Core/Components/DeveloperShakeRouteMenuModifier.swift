#if DEBUG
    import SwiftUI
    import UIKit

    struct DeveloperShakeRouteMenuModifier: ViewModifier {
        let developerSettings: DeveloperSettings

        @State private var isRouteMenuPresented = false

        func body(content: Content) -> some View {
            content
                .background(
                    DeveloperShakeDetector {
                        isRouteMenuPresented = true
                    }
                    .allowsHitTesting(false)
                )
                .sheet(isPresented: $isRouteMenuPresented) {
                    DeveloperRouteMenu(developerSettings: developerSettings) {
                        isRouteMenuPresented = false
                    }
                    .appPresentationBackground()
                    .presentationDetents([.medium])
                    .presentationDragIndicator(.visible)
                }
        }
    }

    private struct DeveloperRouteMenu: View {
        let developerSettings: DeveloperSettings
        let onSelect: () -> Void

        var body: some View {
            NavigationStack {
                List {
                    ForEach(DeveloperRouteOverride.allCases) { route in
                        Button {
                            developerSettings.routeOverride = route
                            onSelect()
                        } label: {
                            HStack {
                                AppText(verbatim: route.title, style: .body)
                                Spacer()

                                if route == developerSettings.routeOverride {
                                    TablerIcons(.check, size: 20, color: Color("Brand"))
                                }
                            }
                        }
                        .foregroundStyle(Color("TextPrimary"))
                    }
                }
                .appScrollBackground()
                .navigationTitle("Routes")
                .navigationBarTitleDisplayMode(.inline)
            }
            .appBackground()
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
        func showsDeveloperRouteMenuOnShake(_ developerSettings: DeveloperSettings) -> some View {
            modifier(DeveloperShakeRouteMenuModifier(developerSettings: developerSettings))
        }
    }

#endif
