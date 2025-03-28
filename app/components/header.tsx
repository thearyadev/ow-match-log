export function Header({ title }: { title: string }) {
    return (
        <div className="w-full text-2xl pb-3">
            <h1>{title}</h1>
        </div>
    )
}
