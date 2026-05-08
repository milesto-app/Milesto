import SwiftUI

struct IntakeLoadingView: View {
    var body: some View {
        AppLoader(size: 32, lineWidth: 3)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(.regularMaterial)
            .ignoresSafeArea()
    }
}
