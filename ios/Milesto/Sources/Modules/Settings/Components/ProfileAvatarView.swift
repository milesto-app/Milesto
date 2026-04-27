import SwiftUI

struct ProfileAvatarView: View {
    let imageData: Data?
    let initials: String
    let size: CGFloat

    var body: some View {
        if let imageData, let uiImage = UIImage(data: imageData) {
            Image(uiImage: uiImage)
                .resizable()
                .scaledToFill()
                .frame(width: size, height: size)
                .clipShape(Circle())
        } else {
            initialsView
        }
    }

    private var initialsView: some View {
        ZStack {
            Circle()
                .fill(Color("TintPrimary").opacity(0.12))
                .frame(width: size, height: size)
            AppText(verbatim: initials, style: size > 60 ? .title : .headline)
                .color(Color("TintPrimary"))
        }
    }
}
