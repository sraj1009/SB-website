export type SupportPageType = 'about' | 'terms' | 'contact' | 'privacy' | 'shipping' | 'returns';

// Add type definition to resolve the import error
export interface SupportPageProps {
  page: SupportPageType;
  onBack: () => void;
  onNavigate: (page: SupportPageType) => void;
}
