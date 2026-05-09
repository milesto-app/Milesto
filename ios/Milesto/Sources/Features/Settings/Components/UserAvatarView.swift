import SwiftUI

struct UserAvatarView: View {
    let imageURL: URL?
    let initials: String
    let size: CGFloat

    var body: some View {
        if let imageURL {
            AsyncImage(url: imageURL) { phase in
                switch phase {
                case let .success(image):
                    image
                        .resizable()
                        .scaledToFill()
                        .frame(width: size, height: size)
                        .clipShape(Circle())
                case .failure, .empty:
                    initialsView
                @unknown default:
                    initialsView
                }
            }
        } else {
            initialsView
        }
    }

    private var initialsView: some View {
        ZStack {
            Circle()
                .fill(Color("Brand").opacity(0.12))
                .frame(width: size, height: size)
            AppText(verbatim: initials, style: size > 60 ? .title : .headline)
                .color(Color("Brand"))
        }
    }
}
