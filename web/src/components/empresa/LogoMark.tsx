interface Props {
  size?: 'sm' | 'lg';
}

export default function LogoMark({ size = 'lg' }: Props) {
  const dimension = size === 'sm' ? 'h-10 w-10' : 'h-20 w-20';

  return (
    <img
      src="/unik-icon.svg"
      alt="Unik Transporte"
      className={`${dimension} shrink-0 rounded-2xl`}
    />
  );
}
