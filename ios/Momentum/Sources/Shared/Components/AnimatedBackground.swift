import SwiftUI

struct AnimatedBackground: View {
    @State private var startDate = Date.now

    var body: some View {
        TimelineView(.animation) { timeline in
            let t = timeline.date.timeIntervalSince(startDate)
            AnimatedBackgroundCanvas(t: t)
        }
        .background(Color(.systemBackground))
    }
}

private struct AnimatedBackgroundCanvas: View {
    let t: Double

    private let accent = AppTheme.Colors.accent
    private let warmTint = Color(red: 0.95, green: 0.78, blue: 0.42)
    private let coolTint = Color(red: 0.40, green: 0.55, blue: 0.85)
    private let softRose = Color(red: 0.88, green: 0.52, blue: 0.58)

    var body: some View {
        GeometryReader { geo in
            Canvas { context, _ in
                let blobs = makeBlobs(w: geo.size.width, h: geo.size.height)
                for blob in blobs {
                    drawBlob(blob, in: &context)
                }
            }
            .blur(radius: 60)
            .ignoresSafeArea()
        }
    }

    private struct Blob {
        let center: CGPoint
        let radius: CGFloat
        let color: Color
    }

    private func makeBlobs(w: CGFloat, h: CGFloat) -> [Blob] {
        let size: CGFloat = w
        var blobs: [Blob] = []

        let b0 = Blob(
            center: CGPoint(x: w * (0.25 + 0.15 * sin(t * 0.3)), y: h * (0.20 + 0.10 * cos(t * 0.25))),
            radius: size * 0.55,
            color: accent.opacity(0.35)
        )
        blobs.append(b0)

        let b1 = Blob(
            center: CGPoint(x: w * (0.75 + 0.12 * cos(t * 0.35)), y: h * (0.35 + 0.12 * sin(t * 0.28))),
            radius: size * 0.50,
            color: coolTint.opacity(0.25)
        )
        blobs.append(b1)

        let b2 = Blob(
            center: CGPoint(x: w * (0.50 + 0.18 * sin(t * 0.22)), y: h * (0.70 + 0.10 * cos(t * 0.32))),
            radius: size * 0.60,
            color: warmTint.opacity(0.20)
        )
        blobs.append(b2)

        let b3 = Blob(
            center: CGPoint(x: w * (0.30 + 0.14 * cos(t * 0.40)), y: h * (0.55 + 0.08 * sin(t * 0.30))),
            radius: size * 0.45,
            color: softRose.opacity(0.18)
        )
        blobs.append(b3)

        let b4 = Blob(
            center: CGPoint(x: w * (0.80 + 0.10 * sin(t * 0.26)), y: h * (0.80 + 0.06 * cos(t * 0.38))),
            radius: size * 0.40,
            color: accent.opacity(0.20)
        )
        blobs.append(b4)

        let b5 = Blob(
            center: CGPoint(x: w * (0.35 + 0.12 * sin(t * 0.34)), y: h * (1.0 + 0.05 * cos(t * 0.28))),
            radius: size * 0.50,
            color: warmTint.opacity(0.22)
        )
        blobs.append(b5)

        let b6 = Blob(
            center: CGPoint(x: w * (0.70 + 0.10 * cos(t * 0.30)), y: h * (1.02 + 0.04 * sin(t * 0.36))),
            radius: size * 0.45,
            color: coolTint.opacity(0.20)
        )
        blobs.append(b6)

        let b7 = Blob(
            center: CGPoint(x: w * (0.85 + 0.08 * cos(t * 0.32)), y: h * (0.05 + 0.03 * sin(t * 0.38))),
            radius: size * 0.30,
            color: softRose.opacity(0.22)
        )
        blobs.append(b7)

        return blobs
    }

    private func drawBlob(_ blob: Blob, in context: inout GraphicsContext) {
        let rect = CGRect(
            x: blob.center.x - blob.radius,
            y: blob.center.y - blob.radius,
            width: blob.radius * 2,
            height: blob.radius * 2
        )
        let gradient = Gradient(colors: [blob.color, blob.color.opacity(0)])
        let shading = GraphicsContext.Shading.radialGradient(
            gradient,
            center: blob.center,
            startRadius: 0,
            endRadius: blob.radius
        )
        context.fill(Ellipse().path(in: rect), with: shading)
    }
}

#Preview {
    AnimatedBackground()
}
