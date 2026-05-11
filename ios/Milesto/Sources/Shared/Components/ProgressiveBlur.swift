import SwiftUI
import UIKit

struct ProgressiveBlur: View {
    var body: some View {
        Color.clear
            .progressiveBlur()
            .frame(height: 60)
            .ignoresSafeArea(edges: .top)
            .allowsHitTesting(false)
    }
}

enum BlurDirection {
    case topToBottom
    case bottomToTop

    var maskColors: [CGColor] {
        switch self {
        case .topToBottom:
            return [
                UIColor.black.cgColor,
                UIColor.black.withAlphaComponent(0.7).cgColor,
                UIColor.black.withAlphaComponent(0.3).cgColor,
                UIColor.black.withAlphaComponent(0.1).cgColor,
                UIColor.clear.cgColor,
            ]
        case .bottomToTop:
            return [
                UIColor.clear.cgColor,
                UIColor.black.withAlphaComponent(0.1).cgColor,
                UIColor.black.withAlphaComponent(0.3).cgColor,
                UIColor.black.withAlphaComponent(0.7).cgColor,
                UIColor.black.cgColor,
            ]
        }
    }
}

extension View {
    func progressiveBlur(radius: Double = 10.0, direction: BlurDirection = .topToBottom) -> some View {
        ZStack {
            self
            VariableBlurView(radius: radius, direction: direction)
        }
    }

    func topProgressiveBlur() -> some View {
        overlay(alignment: .top) { ProgressiveBlur() }
    }
}

private extension UIBlurEffect {
    static func variableBlurEffect(radius: Double, maskImage: UIImage?) -> UIBlurEffect? {
        let selector = NSSelectorFromString("effectWithVariableBlurRadius:imageMask:")
        guard let maskImage, UIBlurEffect.responds(to: selector) else { return nil }
        let type = (@convention(c) (AnyClass, Selector, Double, UIImage?) -> UIBlurEffect).self
        let implementation = UIBlurEffect.method(for: selector)
        let method = unsafeBitCast(implementation, to: type)
        return method(UIBlurEffect.self, selector, radius, maskImage)
    }
}

private struct VariableBlurView: UIViewRepresentable {
    let radius: Double
    let direction: BlurDirection

    func makeUIView(context _: Context) -> UIVisualEffectView {
        let effectView = UIVisualEffectView()
        effectView.backgroundColor = .clear
        applyEffect(to: effectView)
        return effectView
    }

    func updateUIView(_ uiView: UIVisualEffectView, context _: Context) {
        applyEffect(to: uiView)
    }

    private func applyEffect(to view: UIVisualEffectView) {
        let maskImage = generateMaskImage()
        if let effect = UIBlurEffect.variableBlurEffect(radius: radius, maskImage: maskImage) {
            view.effect = effect
        }
    }

    private func generateMaskImage() -> UIImage? {
        let size = CGSize(width: 200, height: 200)
        let renderer = UIGraphicsImageRenderer(size: size)
        return renderer.image { context in
            let cgContext = context.cgContext
            let locations: [CGFloat] = [0.0, 0.2, 0.5, 0.8, 1.0]

            guard let gradient = CGGradient(
                colorsSpace: CGColorSpaceCreateDeviceRGB(),
                colors: direction.maskColors as CFArray,
                locations: locations
            ) else { return }

            cgContext.drawLinearGradient(
                gradient,
                start: CGPoint(x: 0, y: 0),
                end: CGPoint(x: 0, y: size.height),
                options: [.drawsBeforeStartLocation, .drawsAfterEndLocation]
            )
        }
    }
}
