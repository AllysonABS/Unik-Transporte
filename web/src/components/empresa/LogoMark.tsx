interface Props {
  size?: 'sm' | 'lg';
}

export default function LogoMark({ size = 'lg' }: Props) {
  if (size === 'sm') {
    return (
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-matriz border-2 border-border"
        aria-label="Logo Na Rota"
      >
        <div className="relative h-[17px] w-6 overflow-hidden rounded-[1px] bg-pulso">
          <div className="absolute -left-1.5 top-1.5 h-[5px] w-9 -rotate-[35deg] bg-matriz" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex h-20 w-20 items-center justify-center rounded-full bg-matriz border-2 border-border"
      aria-label="Logo Na Rota"
    >
      <div className="relative h-[34px] w-12 overflow-hidden rounded-sm bg-pulso">
        <div className="absolute -left-3 top-3 h-2.5 w-[70px] -rotate-[35deg] bg-matriz" />
      </div>
    </div>
  );
}
