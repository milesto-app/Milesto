import SwiftUI

struct ProfileAvatarView: View {
    let url: URL?
    let initials: String
    let size: CGFloat

    var body: some View {
        if let url {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFill()
                        .frame(width: size, height: size)
                        .clipShape(Circle())
                case .failure:
                    initialsView
                case .empty:
                    ZStack {
                        Circle()
                            .fill(AppTheme.Colors.accent.opacity(0.12))
                            .frame(width: size, height: size)
                        ProgressView()
                    }
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
                .fill(AppTheme.Colors.accent.opacity(0.12))
                .frame(width: size, height: size)
            AppText(verbatim: initials, style: size > 60 ? .title : .headline)
                .color(AppTheme.Colors.accent)
        }
    }
}
