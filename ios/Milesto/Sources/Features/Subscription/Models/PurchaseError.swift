import Foundation

enum PurchaseError: Error, Equatable {
    case missingUser
    case storeFailure(String)
    case verificationFailed
    case accountMismatch
}
