import Foundation

enum PurchaseError: Error {
    case missingUser
    case storeFailure(String)
    case verificationFailed
}
