export default function LogoMark() {
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
