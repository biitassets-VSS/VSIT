export const CustomButton = ({ children, onClick }: any) => (
  <button onClick={onClick} className="bg-blue-600 text-white p-2 rounded">{children}</button>
);