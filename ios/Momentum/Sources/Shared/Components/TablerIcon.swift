import SwiftUI

struct TablerIcon: View {
    private let unicode: String
    var size: CGFloat = 24
    var color: Color?

    init(_ icon: TablerIconOutline, size: CGFloat = 24, color: Color? = nil) {
        unicode = icon.rawValue
        self.size = size
        self.color = color
    }

    static func filled(_ icon: TablerIconFilled, size: CGFloat = 24, color: Color? = nil) -> TablerIcon {
        TablerIcon(unicode: icon.rawValue, size: size, color: color)
    }

    private init(unicode: String, size: CGFloat, color: Color?) {
        self.unicode = unicode
        self.size = size
        self.color = color
    }

    var body: some View {
        Text(unicode)
            .font(.custom("tabler-icons", size: size))
            .foregroundStyle(color ?? Colors.iconDefault)
    }
}

struct TablerTabLabel: View {
    let icon: TablerIconOutline
    let title: String

    init(_ icon: TablerIconOutline, title: String) {
        self.icon = icon
        self.title = title
    }

    private var iconImage: Image {
        let renderer = ImageRenderer(
            content: Text(icon.rawValue)
                .font(.custom("tabler-icons", size: 28))
                .foregroundStyle(.white)
        )
        renderer.scale = UITraitCollection.current.displayScale
        guard let uiImage = renderer.uiImage else {
            return Image(systemName: "questionmark")
        }
        return Image(uiImage: uiImage.withRenderingMode(.alwaysTemplate))
    }

    var body: some View {
        Label {
            Text(title)
        } icon: {
            iconImage
        }
    }
}

extension TablerIcon {
    func size(_ size: CGFloat) -> TablerIcon {
        var copy = self
        copy.size = size
        return copy
    }

    func color(_ color: Color) -> TablerIcon {
        var copy = self
        copy.color = color
        return copy
    }
}
